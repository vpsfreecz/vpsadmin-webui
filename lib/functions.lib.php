<?php
/*
    ./lib/functions.lib.php

    vpsAdmin
    Web-admin interface for OpenVZ (see http://openvz.org)
    Copyright (C) 2008-2009 Pavel Snajdr, snajpa@snajpa.net

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function members_list () {
	global $db;
	if ($_SESSION["is_admin"]) {
		$sql = 'SELECT * FROM members ORDER BY m_nick ASC';
		if ($result = $db->query($sql))
			while ($m = $db->fetch_array($result)) {
			$out[$m["m_id"]] = $m["m_nick"];
			}
		else $out = false;
		return $out;
	}
	else return array($_SESSION["member"]["m_id"] => $_SESSION["member"]["m_nick"]);
}

function get_all_ip_list ($v = 4) {
	global $db;
	$sql = "SELECT * FROM vps_ip WHERE ip_v = {$db->check($v)}";
	$ret = array();
	if ($result = $db->query($sql))
		while ($row = $db->fetch_array($result))
			$ret[$row['ip_id']] = $row['ip_addr'];
	return $ret;
}
function get_all_ip_list_array () {
	global $db;
	$sql = "SELECT * FROM vps_ip";
	$ret = array();
	if ($result = $db->query($sql))
		while ($row = $db->fetch_array($result))
			$ret[] = $row;
	return $ret;
}
function get_ip_by_id($ip_id) {
	global $db;
	$sql = "SELECT * FROM vps_ip WHERE ip_id=".$db->check($ip_id);
	if ($result = $db->query($sql))
	    return $db->fetch_array($result);
}
function get_free_ip_list ($v = 4, $location=false) {
	global $db;
	$sql = 'SELECT * FROM vps_ip WHERE vps_id = 0 AND ip_v = "'.$db->check($v).'"';
	if ($location)
	    $sql .=  ' AND ip_location = "'.$db->check($location).'"';
	$ret = array();
	if ($result = $db->query($sql))
		while ($row = $db->fetch_array($result))
			$ret[$row["ip_addr"]] = $row["ip_addr"];
	return $ret;
}

function validate_ip_address($ip_addr) {
	global $Cluster_ipv4, $Cluster_ipv6;
	if ($Cluster_ipv4->check_syntax($ip_addr))
		return 4;
	elseif ($Cluster_ipv6->check_syntax($ip_addr))
		return 6;
	else
		return false;
}

function ip_exists_in_table($ip_addr) {
	global $db;
	$sql = 'SELECT ip_id,ip_addr,vps_id FROM vps_ip WHERE ip_addr = "'.$db->check($ip_addr).'"';
	if ($result = $db->query($sql))
		if ($row = $db->fetch_array($result))
			return $row;
		else return false;
	else return false;
}

function ip_is_free($ip_addr) {
	if (validate_ip_address($ip_addr))
		$ip_try = ip_exists_in_table($ip_addr);
	else return false;
	if (!$ip_try)
		return true;
	if ($ip_try["vps_id"] == 0)
		return true;
	else return false;
}

function list_configs($empty = false) {
	global $db;
	
	$sql = "SELECT id, `label` FROM config ORDER BY name";
	$ret = $empty ? array(0 => '---') : array();
	
	if ($result = $db->query($sql))
		while ($row = $db->fetch_array($result))
			$ret[$row["id"]] = $row["label"];
	
	return $ret;
}

function list_templates($disabled = true) {
    global $db;
    $sql = 'SELECT * FROM cfg_templates '.($disabled ? '' : 'WHERE templ_enabled = 1').' ORDER BY templ_label ASC';
    if ($result = $db->query($sql))
	while ($row = $db->fetch_array($result)) {
	    $ret[$row["templ_id"]] = $row["templ_label"];
	    if (!$row["templ_enabled"])
			$ret[$row["templ_id"]] .= ' '._('(IMPORTANT: This template is currently disabled, it cannot be used)');
	}
    return $ret;
}

function template_by_id ($id) {
    global $db;
    $sql = 'SELECT * FROM cfg_templates WHERE templ_id="'.$db->check($id).'" LIMIT 1';
    if ($result = $db->query($sql))
	if ($row = $db->fetch_array($result))
	    return $row;
    return false;
}

function list_servers($without_id = false, $roles = array('node', 'backuper', 'mailer', 'storage')) {
    global $db;
	if ($without_id)
		$sql = 'SELECT * FROM servers WHERE server_id != \''.$db->check($without_id).'\' AND server_type IN (\''.implode("','", $roles).'\') ORDER BY server_location,server_id';
	else
		$sql = 'SELECT * FROM servers WHERE server_type IN (\''.implode("','", $roles).'\') ORDER BY server_location,server_id';
	
    if ($result = $db->query($sql))
	while ($row = $db->fetch_array($result))
	    $ret[$row["server_id"]] = $row["server_name"];
    return $ret;
}

function list_playground_servers($without_id = false) {
    global $db;
	if ($without_id)
		$sql = "SELECT server_id, server_name FROM servers INNER JOIN locations ON server_location = location_id WHERE server_id != '".$db->check($without_id)."' AND location_type = 'playground' ORDER BY server_location,server_id";
	else
		$sql = "SELECT server_id, server_name FROM servers INNER JOIN locations ON server_location = location_id WHERE location_type = 'playground' ORDER BY server_location,server_id";

    if ($result = $db->query($sql))
	while ($row = $db->fetch_array($result))
	    $ret[$row["server_id"]] = $row["server_name"];
    return $ret;
}

function server_by_id ($id) {
    global $db;
    $sql = 'SELECT * FROM servers WHERE server_id="'.$db->check($id).'" LIMIT 1';
    if ($result = $db->query($sql))
	if ($row = $db->fetch_array($result))
	    return $row;
    return false;
}

?>
