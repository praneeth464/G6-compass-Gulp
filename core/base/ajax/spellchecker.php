<?php

// print_r( $_POST );
$request_body = file_get_contents('php://input');
$request_body = json_decode($request_body, false);

if( isset($request_body->method) && $request_body->method == 'getSuggestions' ) {
    switch( $request_body->params[1][0] ) {
        case "Herer" :
            $result = '{"id":null,"result":["Her er","Her-er","Hearer","Herr","Here","Hirer","Herero","Herder","Hera","Hare","Hero","Hire","Hewer","Merer","Serer","Here\'s"],"error":null}';
            break;
        case "somme" :
            $result = '{"id":null,"result":["Somme","some","simmer","Sammie","Summer","summer","same","Sammy","Sim","Sm","seem","Mme","Somme\'s","samey","smoke","smote","somber","summed","SAM","Sam","sum"],"error":null}';
            break;
        case "speldt" :
            $result = '{"id":null,"result":["spelt","spilt","splat","split","spelled","spieled","spoilt","splats","splint","splits","septet","spotlit","splat\'s"],"error":null}';
            break;
        case "wordss" :
            $result = '{"id":null,"result":["words","word\'s","Woods","wards","woods","Ward\'s","Wood\'s","ward\'s","woad\'s","wood\'s","woodsy","wort\'s","weirds","weds","weirdos","worlds","worsts","Wed\'s","weeds","wides","word","wordless","world\'s","Worms\'s","swords","wads","worst","Warde\'s","Woody\'s","warders","weed\'s","wolds","woodies","wordy","worse","Lords","Worms","cords","fords","lords","works","worms","sword\'s","voids","wad\'s","wades","wadis","warts","wold\'s","Bord\'s","Cord\'s","Ford\'s","Lord\'s","Mord\'s","cord\'s","ford\'s","lord\'s","weirdo\'s","work\'s","worm\'s","wart\'s","Wade\'s","Worden\'s","wadi\'s","Woodie\'s","warder\'s"],"error":null}';
            break;
    }
}
else {
    $result = '{"id":null,"result":["Herer","somme","speldt","wordss","moar","wurds","twoo","currect"],"error":null}';
    // $result = '{"id":null,"result":["fh","gfghfhg","dfljkhsdfkjsdfklsdf","jklsdflk","bv","kljsdfkljww"],"error":null}';
}

echo( $result );