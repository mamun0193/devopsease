import ngrok from '@ngrok/ngrok';
import TunnelProvider from './tunnelProvider.interface.js';
import logger from '../../utils/logger.js';
class NgrokTunnelProvider extends TunnelProvider {
    constructor() {
        super();
        this._authToken = process.env.NGROK_AUTH_TOKEN;
        if (!this._authToken) {
            logger.warn('NgrokTunnelProvider: NGROK_AUTH_TOKEN is not set — tunnels will fail');
        }
    }
    async createTunnel(targetHost, port) {
        try {
            const listener = await ngrok.forward({
                addr: `${targetHost}:${port}`,
                authtoken: this._authToken,
                proto: 'http',
            });

            const publicUrl = listener.url();
            const providerTunnelId = publicUrl;

            logger.info('Ngrok tunnel created', { publicUrl, port });

            return { publicUrl, providerTunnelId };
        } catch (err) {
            logger.error('Ngrok tunnel creation failed', {
                port,
                error: err.message
            });
            throw new Error(`Tunnel provider error: ${err.message}`);
        }
    }
    async closeTunnel(providerTunnelId) {
        try {
            await ngrok.disconnect(providerTunnelId);
            logger.info('Ngrok tunnel closed', { providerTunnelId });
        } catch (err) {
            logger.warn('Ngrok tunnel close failed (may already be closed)', {
                providerTunnelId,
                error: err.message
            });
        }
    }
}

export default new NgrokTunnelProvider();
