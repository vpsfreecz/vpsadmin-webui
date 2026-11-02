# frozen_string_literal: true

# Launched only by the Node owner, outside bundle exec. Readiness and synthetic
# credentials go to private fd 3; stdout/stderr never carry fixture secrets.
require 'json'
require 'open3'
require 'pathname'
require 'stringio'
require 'timeout'

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
  raise 'unexpected HaveAPI runtime' unless Gem.loaded_specs.fetch('haveapi').version.to_s == '0.32.0'
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
    base_template = SpecSeed.os_template
    base_template.update!(enabled: true, supported: true, hypervisor_type: :vpsadminos)
    templates = { supported: base_template.id }
    { disabled: [false, true], unsupported: [true, false] }.each do |name, flags|
      template = base_template.dup
      template.assign_attributes(label: "Generated client contract #{name}", variant: "sdk-#{name}", enabled: flags[0], supported: flags[1])
      template.save!
      templates[name] = template.id
    end
    facts = {
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
