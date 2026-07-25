import { Command } from 'commander';
import { registerAuthCommands } from '../cli/commands/auth.js';
import { registerRepoCommands } from '../cli/commands/repo.js';
import { registerPipelineCommands } from '../cli/commands/pipeline.js';
import { registerDeployCommands } from '../cli/commands/deploy.js';
import { registerClusterCommands } from '../cli/commands/cluster.js';
import { registerNamespaceCommands } from '../cli/commands/namespace.js';
import { registerPodCommands } from '../cli/commands/pods.js';
import { registerK8sCommands } from '../cli/commands/k8s.js';
import { registerServiceCommands } from '../cli/commands/service.js';
import { registerIngressCommands } from '../cli/commands/ingress.js';
import { registerSecretCommands } from '../cli/commands/secrets.js';
import { registerStatusCommand } from '../cli/commands/status.js';
import { registerLogsCommand } from '../cli/commands/logs.js';
import { registerScaleCommand } from '../cli/commands/scale.js';
import { registerConfigCommands } from '../cli/commands/config.js';
import { registerInitCommand } from '../cli/commands/init.js';
import { registerDoctorCommand } from '../cli/commands/doctor.js';
import { registerContainerCommands } from '../cli/commands/container.js';
import { registerBuildCommands } from '../cli/commands/build.js';
import { registerImageCommands } from '../cli/commands/image.js';
import { registerProjectCommands } from '../cli/commands/project.js';
import { registerNetworkCommands } from '../cli/commands/network.js';
import { registerVolumeCommands } from '../cli/commands/volume.js';
import { registerRegistryCommands } from '../cli/commands/registry.js';
import { registerTunnelCommands } from '../cli/commands/tunnel.js';

const program = new Command();
registerAuthCommands(program);
registerRepoCommands(program);
registerPipelineCommands(program);
registerDeployCommands(program);
registerClusterCommands(program);
registerNamespaceCommands(program);
registerPodCommands(program);
registerK8sCommands(program);
registerServiceCommands(program);
registerIngressCommands(program);
registerSecretCommands(program);
registerStatusCommand(program);
registerLogsCommand(program);
registerScaleCommand(program);
registerConfigCommands(program);
registerInitCommand(program);
registerDoctorCommand(program);
registerContainerCommands(program);
registerBuildCommands(program);
registerImageCommands(program);
registerProjectCommands(program);
registerNetworkCommands(program);
registerVolumeCommands(program);
registerRegistryCommands(program);
registerTunnelCommands(program);

const commands = [];
function extractCommands(cmd, prefix = '') {
    cmd.commands.forEach(c => {
        const name = prefix ? `${prefix} ${c.name()}` : c.name();
        commands.push({ name, description: c.description() });
        if (c.commands.length > 0) {
            extractCommands(c, name);
        }
    });
}
extractCommands(program);
console.log(JSON.stringify(commands, null, 2));
