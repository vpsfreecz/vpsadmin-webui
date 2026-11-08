# frozen_string_literal: true

# Launched only by the Node owner, outside bundle exec. Readiness and synthetic
# credentials go to private fd 3; stdout/stderr never carry fixture secrets.
require 'json'
require 'open3'
require 'pathname'
require 'stringio'
require 'timeout'
require 'securerandom'

def seed_dns_fixture
  now = Time.current
  owner = SpecSeed.user
  zone_attributes = {
    zone_role: :forward_role, zone_source: :external_source,
    enabled: true, label: '', default_ttl: 3600, email: nil
  }
  zone = DnsZone.create!(**zone_attributes, name: 'sdk-dns.example.test.', user: owner)
  empty_zone = DnsZone.create!(**zone_attributes, name: 'sdk-empty.example.test.', user: owner)
  foreign_zone = DnsZone.create!(**zone_attributes, name: 'sdk-foreign.example.test.', user: SpecSeed.other_user)
  servers = [false, false, true].each_with_index.map do |hidden, index|
    DnsServer.create!(node: SpecSeed.node, name: "sdk-ns#{index + 1}.example.test",
                      ipv4_addr: "192.0.2.#{10 + index}", hidden:)
  end
  server_zones = servers.map do |server|
    DnsServerZone.create!(dns_zone: zone, dns_server: server, zone_type: :secondary_type,
                         confirmed: DnsServerZone.confirmed(:confirmed), serial: 1234,
                         loaded_at: now, last_check_at: now, expires_at: now + 1.hour)
  end
  foreign_server_zone = DnsServerZone.create!(
    dns_zone: foreign_zone, dns_server: servers.first, zone_type: :secondary_type,
    confirmed: DnsServerZone.confirmed(:confirmed)
  )
  transfers = [zone, foreign_zone].each_with_index.map do |dns_zone, index|
    ip = IpAddress.create!(network: SpecSeed.network_v4, user: dns_zone.user,
                           ip_addr: "192.0.2.#{180 + index}", prefix: 32, size: 1)
    host = HostIpAddress.create!(ip_address: ip, ip_addr: ip.ip_addr, user_created: true)
    DnsZoneTransfer.create!(dns_zone:, host_ip_address: host, peer_type: :primary_type,
                            confirmed: DnsZoneTransfer.confirmed(:confirmed))
  end
  primary, foreign_primary = transfers
  states = server_zones.each_with_index.map do |server_zone, index|
    failed = index.zero?
    observed = index == 1 ? now - 2.hours : now
    DnsServerZonePrimaryTransferState.create!(
      dns_server_zone: server_zone, dns_zone_transfer: primary,
      configuration_generation: server_zone.primary_transfer_configuration_generation,
      last_event_key: SecureRandom.hex(32), status: failed ? :failed : :success,
      failure_class: failed ? :primary : nil, last_attempt_kind: :ixfr_probe,
      last_attempt_at: now, last_success_at: failed ? nil : observed,
      failed_since: failed ? now - 35.minutes : nil,
      last_failure_at: failed ? observed : nil, reason_observed_at: failed ? observed : nil,
      reason_code: failed ? 'refused' : nil, reason: failed ? 'Synthetic transfer refusal' : nil
    )
  end
  foreign_state = DnsServerZonePrimaryTransferState.create!(
    dns_server_zone: foreign_server_zone, dns_zone_transfer: foreign_primary,
    configuration_generation: foreign_server_zone.primary_transfer_configuration_generation,
    last_event_key: SecureRandom.hex(32), status: :success, last_attempt_kind: :ixfr_probe,
    last_attempt_at: now, last_success_at: now
  )
  logs = [[server_zones.first, :legacy], [server_zones.first, :transfer],
          [foreign_server_zone, :legacy], [server_zones.last, :legacy]].map do |server_zone, attempt_kind|
    DnsServerZoneTransferLog.create!(
      dns_server_zone: server_zone, attempt_kind:, status: :success,
      event_key: SecureRandom.hex(32), event_at: now, primary_addr: '192.0.2.180', serial: 1234,
      raw_message: 'Synthetic privileged diagnostic', source_cursor: 'synthetic-private-cursor'
    )
  end
  {
    owner: owner.id, zone: zone.id, empty_zone: empty_zone.id, foreign_zone: foreign_zone.id,
    primary: primary.id, allocation: primary.host_ip_address.ip_address_id,
    current_path: states[0].id, stale_path: states[1].id, hidden_path: states[2].id,
    foreign_path: foreign_state.id, server_zone: server_zones.first.id,
    legacy_log: logs[0].id, unbound_log: logs[1].id, foreign_log: logs[2].id,
    hidden_log: logs[3].id
  }
end

begin
  root = Pathname.new(ARGV.fetch(0)).realpath.to_s
  expected = ARGV.fetch(1)
  raise 'unexpected arguments' unless ARGV.length == 2
  raise 'Ruby preload refused' if ENV.key?('RUBYOPT') || ENV.key?('RUBYLIB')
  # Register the inherited descriptor before any subprocess, especially TestDb.
  # Otherwise an unregistered fd can survive Process.spawn in a descendant and
  # keep the parent's readiness stream open after this producer closes it.
  pipe = IO.for_fd(3, 'w')
  pipe.close_on_exec = true
  pipe.sync = true
  query = lambda do |*args|
    output, _error, status = Open3.capture3('git', '-C', root, *args)
    raise 'source identity query failed' unless status.success?
    output.strip
  end
  raise 'unexpected API source' unless query.call('rev-parse', 'HEAD') == expected
  raise 'API source must be clean' unless query.call('status', '--porcelain').empty?
  require File.join(root, 'tools/api-schema-export/safety')
  VpsAdmin::SchemaExport::Safety.new(root:).check!
  trap('TERM') { raise Interrupt }
  trap('INT') { raise Interrupt }

  ENV['RACK_ENV'] = 'test'
  ENV['VPSADMIN_PLUGINS'] = 'all'
  ENV['BUNDLE_GEMFILE'] = File.join(root, 'tools/api-schema-export/Gemfile')
  ENV['BUNDLE_PATH'] = File.join(root, 'tools/api-schema-export/.gems')
  ENV['BUNDLE_IGNORE_CONFIG'] = '1'
  require 'bundler/setup'
  raise 'unexpected HaveAPI runtime' unless Gem.loaded_specs.fetch('haveapi').version.to_s == '0.32.2'
  require File.join(root, 'tools/api-schema-export/bootstrap')
  require 'puma'
  require 'rack'
  server = nil
  begin
    # Bootstrap owns disposable TestDb startup and its native at_exit stop/prune.
    # Silence startup diagnostics rather than copying connection URLs or values.
    original_out, original_err = $stdout, $stderr
    $stdout = $stderr = StringIO.new
    api = Timeout.timeout(600) { VpsAdmin::SchemaExport::Bootstrap.new(root:).load }
    # The isolated preview uses the already supported Basic provider across
    # loopback ports; that provider does not register its CORS header itself.
    api.allow_header('Authorization')
    base_template = SpecSeed.os_template
    base_template.update!(enabled: true, supported: true, hypervisor_type: :vpsadminos)
    templates = { supported: base_template.id }
    { disabled: [false, true], unsupported: [true, false] }.each do |name, flags|
      template = base_template.dup
      template.assign_attributes(label: "Generated client contract #{name}", variant: "sdk-#{name}", enabled: flags[0], supported: flags[1])
      template.save!
      templates[name] = template.id
    end
    dns = seed_dns_fixture
    facts = {
      dns:,
      api_revision: expected, templates:, node_id: SpecSeed.node.id,
      tooling: {
        ruby: RUBY_VERSION,
        lock_sha256: Digest::SHA256.file(File.join(root, 'tools/api-schema-export/Gemfile.lock')).hexdigest,
        plugins: VpsAdmin::API::Plugin.registered.keys.map(&:to_s).sort,
        inputs: %w[api/db/schema.rb api/spec/support/db_setup.rb api/spec/support/spec_seed.rb
                   api/spec/support/spec_plugins.rb tools/test_db.rb tools/api-schema-export/bootstrap.rb
                   tools/api-schema-export/safety.rb].to_h do |path|
          [path, Digest::SHA256.file(File.join(root, path)).hexdigest]
        end,
        gems: Gem.loaded_specs.sort.to_h { |name, spec| [name, spec.version.to_s] }
      },
      identities: %i[admin user other_user].to_h do |name|
        user = SpecSeed.public_send(name)
        [name, { id: user.id, login: user.login, password: SpecSeed::PASSWORD }]
      end
    }
    app = Rack::Builder.new { map('/sdk-contract') { run api.app } }.to_app
    server = Puma::Server.new(app, nil, min_threads: 0, max_threads: 1, log_writer: Puma::LogWriter.new(StringIO.new, StringIO.new))
    server.add_tcp_listener('127.0.0.1', 0)
    server.run
    facts[:base_url] = "http://127.0.0.1:#{server.connected_ports.fetch(0)}/sdk-contract/v7.0"
    pipe.puts(JSON.generate(facts))
    pipe.close
    # The parent closes stdin after its bounded matrix, including on failure.
    Timeout.timeout(300) { STDIN.read }
  ensure
    server&.stop(true)
    ActiveRecord::Base.connection_pool.disconnect! if defined?(ActiveRecord::Base)
    $stdout, $stderr = original_out, original_err if original_out
  end
rescue Interrupt
  exit 130
rescue StandardError => e
  # Exception messages can contain database URLs, passwords or response values.
  warn "Isolated API fixture failed (#{e.class})"
  exit 1
end
