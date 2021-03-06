module NodeCtld
  STANDALONE = true unless const_defined?(:STANDALONE)
end

if NodeCtld::STANDALONE
  require 'nodectld'
  require 'nodectld/config'

  OsCtl::Lib::Logger.setup(:stdout)
  $CFG = NodeCtld::AppConfig.new(ENV['CONFIG'] || '/etc/vpsadmin/nodectld.yml')

  exit(false) unless $CFG.load(ENV['DB_CONFIG'])
end
