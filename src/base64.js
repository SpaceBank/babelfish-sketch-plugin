export function encodeBin(buffer) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const wholeBlockNumber = ~~(buffer.length / 3);
    const extraBytesNumber = buffer.length - 3 * wholeBlockNumber;
    var result = "";

    for (var blockIndex = 0; blockIndex < wholeBlockNumber; blockIndex++) {
        var offset = 3 * blockIndex;
        var value = (buffer[offset + 0] << 16) | (buffer[offset + 1] << 8) | buffer[offset + 2];
        result +=
            alphabet[(value >> 18) & 63] +
            alphabet[(value >> 12) & 63] +
            alphabet[(value >>  6) & 63] +
            alphabet[(value >>  0) & 63];
    }

    var offset = 3 * wholeBlockNumber;

    if (extraBytesNumber == 1) {
        var value = (buffer[offset + 0] << 16);

        result +=
            alphabet[(value >> 18) & 63] +
            alphabet[(value >> 12) & 63] +
            "==";

    } else if (extraBytesNumber == 2) {
        var value = (buffer[offset + 0] << 16) | (buffer[offset + 1] << 8);

        result +=
            alphabet[(value >> 18) & 63] +
            alphabet[(value >> 12) & 63] +
            alphabet[(value >>  6) & 63] +
            "=";
    }

    return result;
}


export function encodeStr(buffer) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const wholeBlockNumber = ~~(buffer.length / 3);
    const extraBytesNumber = buffer.length - 3 * wholeBlockNumber;
    var result = "";

    for (var blockIndex = 0; blockIndex < wholeBlockNumber; blockIndex++) {
        var offset = 3 * blockIndex;
        var value = (buffer.charCodeAt(offset + 0) << 16) | (buffer.charCodeAt(offset + 1) << 8) | buffer.charCodeAt(offset + 2);
        result +=
            alphabet[(value >> 18) & 63] +
            alphabet[(value >> 12) & 63] +
            alphabet[(value >>  6) & 63] +
            alphabet[(value >>  0) & 63];
    }

    var offset = 3 * wholeBlockNumber;

    if (extraBytesNumber == 1) {
        var value = (buffer.charCodeAt(offset + 0) << 16);

        result +=
            alphabet[(value >> 18) & 63] +
            alphabet[(value >> 12) & 63] +
            "==";

    } else if (extraBytesNumber == 2) {
        var value = (buffer.charCodeAt(offset + 0) << 16) | (buffer.charCodeAt(offset + 1) << 8);

        result +=
            alphabet[(value >> 18) & 63] +
            alphabet[(value >> 12) & 63] +
            alphabet[(value >>  6) & 63] +
            "=";
    }

    return result;
}
