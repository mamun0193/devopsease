const Docker = require("dockerode");

const docker = new Docker(); // auto-detects Windows / Linux / Mac

module.exports = docker;
