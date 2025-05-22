author "Wartype // SyntaxJunkies"
fx_version 'cerulean'
game 'rdr3'
rdr3_warning 'I acknowledge that this is a prerelease build of RedM, and I am aware my resources *will* become incompatible once RedM ships.'
lua54 'yes'
description 'Basic RedM Loading Screen'
version '0.3'

loadscreen 'html/index.html'
loadscreen_cursor 'yes'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js'
}

shared_scripts {
     'config.lua'
}

server_scripts {
	'server.lua'
}