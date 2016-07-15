<?php

    // we only do skin setting on layout.html
    if( preg_match('/layout.html/', $_SERVER['REQUEST_URI']) ) {

        $cookieLocation = preg_replace('/router.php$/', '', $_SERVER['PHP_SELF']);

        // see if we have a skin context and skin name passed in the query string (this will override anything in skin.inc)
        if( (isset($_GET['skinContext'])) && isset($_GET['skinName']) ) {
            $skinContextOverride = $_GET['skinContext'] == '' ? 'core' : $_GET['skinContext'];
            $skinNameOverride = $_GET['skinName'];

            setcookie('skinContext', $skinContextOverride, 0, $cookieLocation);
            setcookie('skinName', $skinNameOverride, 0, $cookieLocation);
        }
        // see if we have a skin reset passed in the query string (this will revert to the values in skin.inc)
        elseif( isset($_GET['skinReset']) ) {
            setcookie('skinContext', "", time() - 3600, $cookieLocation);
            setcookie('skinName', "", time() - 3600, $cookieLocation);
        }

        // see if we have a skin context and skin name stored in a cookie (this will override anything in skin.inc)
        elseif( isset($_COOKIE['skinContext']) && isset($_COOKIE['skinName']) ) {
            $skinContextOverride = $_COOKIE['skinContext'];
            $skinNameOverride = $_COOKIE['skinName'];
        }
    }

    // on any other request, we have to check for a cookie
    // see if we have a skin context and skin name stored in a cookie (this will override anything in skin.inc)
    elseif( isset($_COOKIE['skinContext']) && isset($_COOKIE['skinName']) ) {
        $skinContextOverride = $_COOKIE['skinContext'];
        $skinNameOverride = $_COOKIE['skinName'];
    }

    //get the skin variables and some paths and things that we'll need
    require_once('skin.inc');

    //this is just for the 404-like page that we prepend an error to
    $homeRelative = $releaseDirPath . 'core/base/layout.html';

    //map out the path to the core version of the file
    $coreFile = $_SERVER['DOCUMENT_ROOT'].str_replace( $_SERVER['SERVER_NAME'], '', $_SERVER['REQUEST_URI'] );
    $coreFile = str_replace( '?'.$_SERVER['QUERY_STRING'], '', $coreFile );

    //create a relative path so we can use that in the skinFile mappings
    $relativePath = str_replace( $g5BaseUrl.$releaseDirPath, '', $_SERVER['REQUEST_URI'] );
    $relativePath = str_replace( '?'.$_SERVER['QUERY_STRING'], '', $relativePath );

    $baseUrl = $skinOn === true ? $skinsBaseUrl : $g5BaseUrl;

    //this assumes that all nested include() statements within files are written relative to the core directory. Any that start with ., .., or / will ignore these paths
    set_include_path($_SERVER['DOCUMENT_ROOT'].$g5BaseUrl.$releaseDirPath.'core/' . PATH_SEPARATOR . get_include_path());
    set_include_path($_SERVER['DOCUMENT_ROOT'].$baseUrl.'clients/'.$skinContext.'custom/' . PATH_SEPARATOR . get_include_path());

    //get this for determining the content type and the skinFile mapping
    $ext = pathinfo($coreFile, PATHINFO_EXTENSION);

    //depending on the extension we need to do some crafty stuff (aka hacks)
    switch( $ext ):

        case "css":
            header('Content-Type: text/css');
            $skinFile = $_SERVER['DOCUMENT_ROOT'].$baseUrl.'clients/'.$skinContext.'skins/'.str_replace('core/base',$skinName,$relativePath);
            break;

        case "js":
            header('Content-Type: text/javascript');
            $skinFile = $_SERVER['DOCUMENT_ROOT'].$baseUrl.'clients/'.$skinContext.str_replace('core/','custom/',$relativePath);
            break;

        case "json":
            header('Content-Type: application/json');
            $skinFile = $_SERVER['DOCUMENT_ROOT'].$baseUrl.'clients/'.$skinContext.str_replace('core/','custom/',$relativePath);
            break;

        case "html":
            header('Content-Type: text/html');
            $skinFile = $_SERVER['DOCUMENT_ROOT'].$baseUrl.'clients/'.$skinContext.str_replace('core/','custom/',$relativePath);
            break;

        case "init":
            header('Content-Type: text/plain');
            $skinFile = $_SERVER['DOCUMENT_ROOT'].$baseUrl.'clients/'.$skinContext.str_replace('core/','custom/',$relativePath);
            break;

        case "png":
            header("Content-Type: image/png");
            $skinFile = $_SERVER['DOCUMENT_ROOT'].$baseUrl.'clients/'.$skinContext.'skins/'.str_replace('core/base',$skinName,$relativePath);
            break;

        case "jpg":
            header("Content-Type: image/jpeg");
            $skinFile = $_SERVER['DOCUMENT_ROOT'].$baseUrl.'clients/'.$skinContext.'skins/'.str_replace('core/base',$skinName,$relativePath);
            break;

        case "gif":
            header("Content-Type: image/gif");
            $skinFile = $_SERVER['DOCUMENT_ROOT'].$baseUrl.'clients/'.$skinContext.'skins/'.str_replace('core/base',$skinName,$relativePath);
            break;

        default:
            $skinFile = 'Unexpected extension: '.$ext;
            break;

    endswitch;

    //these two types we need to process as PHP
    //the others we can just read them out
    //and, in fact, we HAVE to read some of them rather than the output buffer (ob) method needed for PHP files
    //because images (and other binary formats) don't work to send through this way
    if( $ext == 'html' || $ext == 'json' ):

        ob_start();
        if( $skinOn && @include( $skinFile ) ):
            header("G5-File-Retrieved: CUSTOM");
            http_response_code(200);
            ob_end_flush();
            die();
        else:
            if( @include( $coreFile ) ):
                header("G5-File-Retrieved: CORE");
                http_response_code(200);
                ob_end_flush();
                die();
            elseif( file_exists($coreFile) ):
                // we can assume that the file ran through here via an include() so we don't want to throw the error
                die();
            else:
                echo '<div style="background: red; color: white; text-align: center;">File not found in skin or release directories';
                echo "\r<br>\r";
                echo $skinFile;
                echo "\r<br>\r";
                echo $coreFile;
                echo '</div>';
                // @include( $_SERVER['DOCUMENT_ROOT'].$baseUrl.$homeRelative );
                ob_end_flush();
                die();
            endif;
        endif;

    else:
        if( $skinOn && isset( $skinFile ) && file_exists( $skinFile ) ):
            header("G5-File-Retrieved: CUSTOM");
            readfile( $skinFile );
        elseif( file_exists( $coreFile ) ):
            header("G5-File-Retrieved: CORE");
            readfile( $coreFile );
        else:
            header("G5-File-Retrieved: None (404)");
            http_response_code(404);
            if( isset( $skinFile ) ):
                echo 'neither file found:';
                echo "\r<br>\r";
                echo $skinFile;
                echo "\r<br>\r";
            else:
                echo 'Core file not found';
            endif;
            echo $coreFile;
        endif;
    endif;