import VerificationProvider from './verificationProvider.interface.js';
import crypto from 'crypto';
import fetch from 'node-fetch';

export default class HttpVerificationProvider extends VerificationProvider {
    get method() {
        return 'http';
    }

    async generateChallenge(domain) {
        const token = crypto.randomUUID().replace(/-/g, '');
        const filename = `${token}.txt`;
        const path = `/.well-known/devopsease-challenge/${filename}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        const instructions = `Create a file containing the token at the following URL on your domain:\n` +
                             `URL: http://${domain.hostname}${path}\n` +
                             `File Content: ${token}`;

        return {
            token,
            instructions,
            expiresAt
        };
    }

    async verify(domain, challenge) {
        if (new Date() > challenge.expiresAt) {
            return { verified: false, reason: 'Challenge token expired' };
        }

        const url = `http://${domain.hostname}/.well-known/devopsease-challenge/${challenge.token}.txt`;

        try {
            const response = await fetch(url, { timeout: 5000 });
            
            if (!response.ok) {
                return { verified: false, reason: `HTTP request returned status ${response.status}` };
            }
            
            const text = await response.text();
            
            if (text.trim() === challenge.token) {
                return { verified: true, reason: 'HTTP challenge file matched token' };
            }
            
            return { verified: false, reason: 'HTTP challenge file contents did not match token' };
        } catch (error) {
             if (domain.autoManaged) {
                  return { verified: true, reason: 'Auto-managed domains skip HTTP verification' };
             }
            return { verified: false, reason: `Failed to fetch HTTP challenge: ${error.message}` };
        }
    }
}
