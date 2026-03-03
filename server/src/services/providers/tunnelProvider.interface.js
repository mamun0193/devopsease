class TunnelProvider {

    async createTunnel(targetHost, port) {
        throw new Error('TunnelProvider.createTunnel() must be implemented by subclass');
    }

    async closeTunnel(providerTunnelId) {
        throw new Error('TunnelProvider.closeTunnel() must be implemented by subclass');
    }
}

export default TunnelProvider;
