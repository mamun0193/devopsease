import Docker from "dockerode";

const docker = new Docker(); // auto-detects Windows / Linux / Mac

export default docker;
