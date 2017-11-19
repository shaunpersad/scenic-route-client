"use strict";

function join(pieces) {

    return pieces.map(piece => piece.replace(/^\/|\/$/g, '')).filter(piece => piece.length).join('/');
}

module.exports = join;
