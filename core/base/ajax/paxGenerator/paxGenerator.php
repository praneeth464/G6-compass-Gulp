<?php

$cmpSortBy;
$cmpSortOn;

$file = "core/base/ajax/paxGenerator/fakenames.csv";
$deps = array('IT','HR','Sales','R&D');
$jobs = array('Analyst','Developer','Accountant','Salesperson','VP');
$orgs = array('West Coast','East Coast','New York','Alabama','Montgomery');
$orgTypes = array('Regional', 'State', 'City');

// get next line of data
function getLine($handle) {
    return fgetcsv($handle, 1000, ",");
}

// random department name
function getDepName() {
    global $deps;
    return $deps[array_rand($deps,1)];
}

// random job name
function getJobName() {
    global $jobs;
    return $jobs[array_rand($jobs,1)];
}

// random org name
function getOrgName() {
    global $orgs;
    return $orgs[array_rand($orgs,1)];
}

// random org type
function getOrgType() {
    global $orgTypes;
    return $orgTypes[array_rand($orgTypes,1)];
}

// get a POST or GET param
function p($k,$def) {
    if(isset($_POST[$k])) return $_POST[$k];
    if(isset($_GET[$k])) return $_GET[$k];
    return $def;
}

// generate num paxes in json format
function generatePaxes($num=50) {
    global $file;

    $handle = fopen($file,"r");

    // file read problem
    if($handle === false) {
        echo getcwd();
        echo "Could not open file: $file";
        return;
    }

    $paxes = array();

    // build array of paxes
    for($i=0; $i<$num&&$i<1000; $i++) {
        $arr = getLine($handle);
        $json = array(
            'id' => intval($arr[0], 10),
            'lastName' => $arr[2],
            'firstName' => $arr[1],
            'countryName' => $arr[5],
            'countryCode' => $arr[4],
            'avatarUrl' => "img/_samples/x-profile-pic1.jpg",
            'departmentName' => getDepName(),
            'jobName' => getJobName(),
            'orgName' => getOrgName(),
            'orgType' => getOrgType()
            );
        array_push($paxes, $json);
    }
    fclose($handle);

    return $paxes;
}


// json
function generatePaxesJson($num=50, $extraDat=array()) {
    $paxes = generatePaxes($num);

    foreach($paxes as &$pax) {
        $pax = array_merge($pax, $extraDat);
    }

    echo json_encode($paxes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
}

function cmp($a,$b) {
    global $cmpSortOn,$cmpSortBy;
    $res = strcmp($a[$cmpSortOn],$b[$cmpSortOn]);
    return $cmpSortBy==='asc'?$res:-$res;
}

// paginated
function generatePaxesPaginatedJson($recordsPerPage=50,$recordsTotal=1000, $extraDat=array()) {
    global $cmpSortOn,$cmpSortBy;
    $cp = intval(p('currentPage',1), 10);
    $by = p('sortedBy','asc');
    $on = p('sortedOn','lastName');

    $paxes = generatePaxes($recordsTotal); // all of them

    foreach($paxes as &$pax) {
        $pax = array_merge($pax,$extraDat);
    }

    // globals for cmp comparator func
    $cmpSortOn = $on;
    $cmpSortBy = $by;
    usort($paxes,'cmp'); // call the comparator

    $paxes = array_slice($paxes, ($cp-1)*$recordsPerPage, $recordsPerPage);


    $o = array(
        'messages' => array(),
        'currentPage' => $cp,
        'sortedBy' => $by,
        'sortedOn' => $on,
        'recordsPerPage' => $recordsPerPage,
        'recordsTotal' => $recordsTotal,
        'participants' => $paxes
    );

    echo json_encode($o, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
}



        // {
        //     "id":"98701",
        //     "lastName":"Dupont",
        //     "firstName":"Aaron",
        //     "avatarUrl":"img/_samples/x-profile-pic1.jpg",
        //     "departmentName":"HR",
        //     "jobName":"Cube Filler",
        //     "countryName":"United States",
        //     "countryCode":"us",
        //     "isSelected":false,
        //     "isLocked":false
        // }

?>