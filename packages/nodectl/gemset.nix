{
  coderay = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "15vav4bhcc2x3jmi3izb11l4d9f3xv8hp2fszb7iqmpsccv1pz4y";
      type = "gem";
    };
    version = "1.1.2";
  };
  curses = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "0vbcadjzxcw3nfd188mxdbm0z2qmmpj1dicdgivqx0xw1z9d1854";
      type = "gem";
    };
    version = "1.2.5";
  };
  eventmachine = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "0wh9aqb0skz80fhfn66lbpr4f86ya2z5rx6gm5xlfhd05bj1ch4r";
      type = "gem";
    };
    version = "1.2.7";
  };
  gli = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "1sgfc8czb7xk0sdnnz7vn61q4ixbkrpz2mkvcgchfkll94rlqhal";
      type = "gem";
    };
    version = "2.17.2";
  };
  highline = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "01ib7jp85xjc4gh4jg0wyzllm46hwv8p0w1m4c75pbgi41fps50y";
      type = "gem";
    };
    version = "1.7.10";
  };
  ipaddress = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "1x86s0s11w202j6ka40jbmywkrx8fhq8xiy8mwvnkhllj57hqr45";
      type = "gem";
    };
    version = "0.8.3";
  };
  json = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "01v6jjpvh3gnq6sgllpfqahlgxzj50ailwhj9b3cd20hi2dx0vxp";
      type = "gem";
    };
    version = "2.1.0";
  };
  libnodectld = {
    dependencies = ["eventmachine" "json" "libosctl" "mail" "mysql2" "osctl" "pry" "pry-remote" "require_all"];
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "0rsc9zrjcp77qn3mr62g8aw69mlsiyf7j973035p3sjsqm6b747n";
      type = "gem";
    };
    version = "3.0.0.dev.build20181105132416";
  };
  libosctl = {
    dependencies = ["require_all"];
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "0mwgncr72jkgnqrn634naa4slcpwgfrcn2ids04x5yvrk9qm6szk";
      type = "gem";
    };
    version = "18.09.0.build20181102175550";
  };
  mail = {
    dependencies = ["mini_mime"];
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "00wwz6ys0502dpk8xprwcqfwyf3hmnx6lgxaiq6vj43mkx43sapc";
      type = "gem";
    };
    version = "2.7.1";
  };
  method_source = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "1jk3vvgjh9qhf4bkal76p1g9fi8aqnhgr33wcddwkny0nb73ms91";
      type = "gem";
    };
    version = "0.9.1";
  };
  mini_mime = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "1q4pshq387lzv9m39jv32vwb8wrq3wc4jwgl4jk209r4l33v09d3";
      type = "gem";
    };
    version = "1.0.1";
  };
  mysql2 = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "1a2kdjgzwh1p2rkcmxaawy6ibi32b04wbdd5d4wr8i342pq76di4";
      type = "gem";
    };
    version = "0.5.2";
  };
  nodectl = {
    dependencies = ["json" "libnodectld" "pry" "pry-remote" "require_all"];
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "1538mbv6hv6h3mn2f3397in3g71y7c96i44k7ymxmyczm2npmxlp";
      type = "gem";
    };
    version = "3.0.0.dev.build20181105132416";
  };
  osctl = {
    dependencies = ["curses" "gli" "highline" "ipaddress" "json" "libosctl" "rainbow" "require_all" "ruby-progressbar"];
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "085fzwdbpy8yl00vwnmzgp1pz91cvv3fb8k7rhry70spv5b2f86v";
      type = "gem";
    };
    version = "18.09.0.build20181102175550";
  };
  pry = {
    dependencies = ["coderay" "method_source"];
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "1mh312k3y94sj0pi160wpia0ps8f4kmzvm505i6bvwynfdh7v30g";
      type = "gem";
    };
    version = "0.11.3";
  };
  pry-remote = {
    dependencies = ["pry" "slop"];
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "10g1wrkcy5v5qyg9fpw1cag6g5rlcl1i66kn00r7kwqkzrdhd7nm";
      type = "gem";
    };
    version = "0.1.8";
  };
  rainbow = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "0bb2fpjspydr6x0s8pn1pqkzmxszvkfapv0p4627mywl7ky4zkhk";
      type = "gem";
    };
    version = "3.0.0";
  };
  require_all = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "0sjf2vigdg4wq7z0xlw14zyhcz4992s05wgr2s58kjgin12bkmv8";
      type = "gem";
    };
    version = "2.0.0";
  };
  ruby-progressbar = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "1igh1xivf5h5g3y5m9b4i4j2mhz2r43kngh4ww3q1r80ch21nbfk";
      type = "gem";
    };
    version = "1.9.0";
  };
  slop = {
    source = {
      remotes = ["https://rubygems.vpsfree.cz"];
      sha256 = "00w8g3j7k7kl8ri2cf1m58ckxk8rn350gp4chfscmgv6pq1spk3n";
      type = "gem";
    };
    version = "3.6.0";
  };
}