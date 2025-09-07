const { ethers, utils } = require("ethers");

const hashUtf8 = (s) => utils.keccak256(utils.toUtf8Bytes(s));

let yam = "d3371be3";

hashUtf8(yam);
console.log(hashUtf8(yam));
