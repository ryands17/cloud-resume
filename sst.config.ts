/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(_input) {
    return {
      name: 'vps-demo',
      removal: 'remove',
      home: 'local',
      providers: {
        docker: '4.5.6',
        hcloud: '1.20.4',
        tls: '5.0.7',
        cloudflare: '6.4.1',
      },
    };
  },
  async run() {
    const { writeFileSync } = await import('node:fs');
    const { resolve: pathResolve } = await import('node:path');
    const packageJson = await import('./package.json');

    // Generate an SSH key
    const sshKeyLocal = new tls.PrivateKey('privateKey', {
      algorithm: 'ED25519',
    });
    // Add the SSH key to Hetzner
    const sshKeyHetzner = new hcloud.SshKey('publicKey', {
      publicKey: sshKeyLocal.publicKeyOpenssh,
    });
    // get the docker image
    const dockerImage = await hcloud.getImage({
      name: 'docker-ce',
      withArchitecture: 'arm',
      mostRecent: true,
    });
    // add a firewall
    // const firewall = new hcloud.Firewall('appServerFirewall', {
    //   name: 'appServerFirewall',
    //   rules: [
    //     {
    //       direction: 'in',
    //       protocol: 'tcp',
    //       port: '80',
    //       sourceIps: ['0.0.0.0/0', '::/0'],
    //     },
    //     {
    //       direction: 'in',
    //       protocol: 'tcp',
    //       port: '443',
    //       sourceIps: ['0.0.0.0/0', '::/0'],
    //     },
    //   ],
    // });
    // vm to deploy docker container to
    const vm = new hcloud.Server('appServer', {
      image: String(dockerImage.id),
      name: 'appServer',
      serverType: 'cax11',
      location: 'hel1',
      userData: [
        `#!/bin/bash`,
        'curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.noarmor.gpg | tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null',
        'curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.tailscale-keyring.list | tee /etc/apt/sources.list.d/tailscale.list',
        'apt-get install ca-certificates curl',
        `apt-get update`,
        'apt-get install -y tailscale',
      ].join('\n'),
      publicNets: [{ ipv6Enabled: true, ipv4Enabled: true }],
      sshKeys: [sshKeyHetzner.id],
      // firewallIds: [firewall.id as unknown as number],
    });
    // Store the private SSH Key on disk to be able to pass it to the Docker Provider
    const sshKeyLocalPath = sshKeyLocal.privateKeyOpenssh.apply((k) => {
      const path = 'id_ed25519_hetzner';
      writeFileSync(path, k, { mode: 0o600 });
      return pathResolve(path);
    });
    // Connect to the Docker Server on the Hetzner Server
    const dockerServer = new docker.Provider('dockerServer', {
      host: 'ssh://root@appserver',
      sshOpts: [
        '-i',
        sshKeyLocalPath,
        '-o',
        'StrictHostKeyChecking=no',
        '-p',
        '22',
      ],
    });
    // Setup Docker Networks
    const dockerNetworkPublic = new docker.Network(
      'publicDockerNetwork',
      { name: 'app_network_public' },
      { provider: dockerServer, dependsOn: [vm] },
    );
    // Build the Docker image
    const dockerImageApp = new docker.Image(
      'appImage',
      {
        imageName: `cloud-resume/cloud-resume:${packageJson.version}`,
        build: {
          context: pathResolve('./'),
          dockerfile: pathResolve('./Dockerfile'),
          platform: 'linux/arm64',
        },
        skipPush: true,
      },
      {
        provider: dockerServer,
        dependsOn: [vm],
      },
    );
    // run the app
    const app = new docker.Container(
      'cloudResume',
      {
        name: 'cloud-resume',
        image: dockerImageApp.imageName,
        ports: [
          { internal: 80, external: 80 },
          { internal: 443, external: 443 },
        ],
        networksAdvanced: [{ name: dockerNetworkPublic.id }],
        restart: 'always',
      },
      { provider: dockerServer, dependsOn: [dockerImageApp] },
    );
    // fetch cloudflare hosted zone
    const domain = 'ryan17.dev';
    const zoneId = '780f00808dd53ed4a0a41aa3dad258d0';

    // add new records for our app
    new cloudflare.DnsRecord(
      'rootARecord',
      {
        zoneId: zoneId,
        name: domain,
        type: 'A',
        content: vm.ipv4Address,
        proxied: true,
        ttl: 1,
      },
      {
        dependsOn: [vm],
      },
    );
    new cloudflare.DnsRecord(
      'rootA4Record',
      {
        zoneId: zoneId,
        name: domain,
        type: 'AAAA',
        content: vm.ipv6Address,
        proxied: true,
        ttl: 1,
      },
      {
        dependsOn: [vm],
      },
    );
    new cloudflare.DnsRecord(
      'rootWwwRecord',
      {
        zoneId: zoneId,
        name: 'www.' + domain,
        type: 'A',
        content: vm.ipv4Address,
        proxied: true,
        ttl: 1,
      },
      {
        dependsOn: [vm],
      },
    );
    new cloudflare.DnsRecord(
      'rootWwwA4Record',
      {
        zoneId: zoneId,
        name: 'www.' + domain,
        type: 'AAAA',
        content: vm.ipv6Address,
        proxied: true,
        ttl: 1,
      },
      {
        dependsOn: [vm],
      },
    );
    return { website: 'https://ryan17.dev' };
  },
});
