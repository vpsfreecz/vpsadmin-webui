(function () {

var timeout;
var filters = [
	'limit', 'ip_version', 'environment', 'location', 'network', 'ip_range',
	'node', 'ip_address', 'vps', 'user'
];

function pad(num, size) {
	var s = num+"";

	while (s.length < size)
		s = "0" + s;

	return s;
}

function round (number, precision) {
	var factor = Math.pow(10, precision);
	var tempNumber = number * factor;
	var roundedTempNumber = Math.round(tempNumber);
	return roundedTempNumber / factor;
}

function formatDataRate(n) {
	var units = [
		{threshold: 2 << 29, unit: 'G'},
		{threshold: 2 << 19, unit: 'M'},
		{threshold: 2 << 9,  unit: 'k'},
	];

	ret = "";
	selected = 0;

	for (var i = 0; i < units.length; i++) {
		if (n > units[i].threshold)
			return round((n / units[i].threshold), 2) + units[i].unit;
	}

	return round(n, 2);
}

function getIpAddressId (v, callback) {
	if (/^\d+$/.test(v))
		return callback(v);

	apiClient.ip_address.list({addr: v}, function (c, ips) {
		if (ips.length < 1)
			return callback(false);

		callback(ips.first().id);
	});
}

function getParams (callback) {
	var ret = {
		'meta': {
			'includes': 'ip_address__network_interface',
		}
	};

	filters.forEach(function (param) {
		var v = $('#monitor-filters').find('*[name="'+param+'"]').val();

		if (v && !(v === '0'))
			ret[param] = v;
	 });

	if (ret.ip_address) {
			getIpAddressId(ret.ip_address, function (id) {
				if (id)
					ret.ip_address = id;

				else
					delete ret.ip_address;

				callback(ret);
			});

			return;
	}

	return callback(ret);
}

function td () {
	return $('<td>').html(Array.prototype.slice.call(arguments).join(''));
}

function rate (n, delta) {
	return td(formatDataRate(n / delta * 8)).css('text-align', 'right');
}

function updateMonitor () {
	getParams(function (params) {
		apiClient.ip_traffic_monitor.list(params, function (c, list) {
			$('#live_monitor tr').slice(3).remove();

			list.each(function (stat) {
				var tr = $('<tr>');

				tr.append(td(
					'<a href="?page=adminvps&action=info&veid='+stat.ip_address.network_interface.vps_id+'">' +
					stat.ip_address.network_interface.vps_id +
					'</a>'
				));
				tr.append(td(stat.ip_address.addr));

				['public', 'private'].forEach(function (role) {
					tr.append(rate(stat[role+'_bytes_in'], stat.delta));
					tr.append(rate(stat[role+'_bytes_out'], stat.delta));
					tr.append(rate(stat[role+'_bytes'], stat.delta));
				});

				tr.append(rate(stat.bytes_in, stat.delta));
				tr.append(rate(stat.bytes_out, stat.delta));
				tr.append(rate(stat.bytes, stat.delta));

				tr.appendTo('#live_monitor tbody');
			});
		});
	});

	timeout = setTimeout(updateMonitor, 10000);

	var now = new Date();

	$('#monitor-last-update').html(
		now.getFullYear()+'-'+pad(now.getMonth() + 1, 2)+'-'+pad(now.getDate() + 1, 2)+' '+
		pad(now.getHours(), 2)+':'+pad(now.getMinutes(), 2)+':'+pad(now.getSeconds(), 2)
	);
}

$(document).ready(function () {
	timeout = setTimeout(updateMonitor, 10000)

	$('#monitor-filters input[name="refresh"]').change(function () {
		if (this.checked) {
			updateMonitor();

		} else {
			clearTimeout(timeout);
			timeout = null;
		}
	});

	filters.forEach(function (name) {
		$('#monitor-filters *[name="'+name+'"]').change(function () {
			if (timeout)
				updateMonitor();
		});
	});
});

}());
