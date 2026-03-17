// ── Utility Functions ──

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function octetToBinary(octet) {
    return clamp(octet, 0, 255).toString(2).padStart(8, '0');
}

function cidrToMaskOctets(cidr) {
    const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
    return [
        (mask >>> 24) & 0xff,
        (mask >>> 16) & 0xff,
        (mask >>> 8) & 0xff,
        mask & 0xff,
    ];
}

// ── Rendering ──

function createBitElements(bits, classifyBit) {
    const fragment = document.createDocumentFragment();
    for (let octet = 0; octet < 4; octet++) {
        if (octet > 0) {
            const sep = document.createElement('span');
            sep.textContent = '.';
            fragment.appendChild(sep);
        }
        const group = document.createElement('span');
        group.dataset.octet = octet;
        for (let b = 0; b < 8; b++) {
            const i = octet * 8 + b;
            const span = document.createElement('span');
            span.dataset.type = classifyBit(i);
            span.textContent = bits[i];
            group.appendChild(span);
        }
        fragment.appendChild(group);
    }
    return fragment;
}

function update() {
    const ipInputs = document.querySelectorAll('#inputs fieldset:first-of-type input');
    const ipOctets = Array.from(ipInputs).map(input => clamp(parseInt(input.value) || 0, 0, 255));
    const cidr = parseInt(document.querySelector('#inputs input[type="range"]').value);
    const maskOctets = cidrToMaskOctets(cidr);

    // Update CIDR display
    document.querySelector('#inputs output').textContent = '/' + cidr;
    document.querySelector('#inputs small').textContent = maskOctets.join('.');

    // Get full 32-bit binary strings
    const ipBinary = ipOctets.map(o => octetToBinary(o)).join('');
    const maskBinary = maskOctets.map(o => octetToBinary(o)).join('');

    // Compute network via AND
    const networkOctets = ipOctets.map((o, i) => o & maskOctets[i]);
    const networkBinary = networkOctets.map(o => octetToBinary(o)).join('');

    // Render bits into the table cells (1st, 3rd, 5th rows)
    const cells = document.querySelectorAll('#binary table td');
    const ipCell = cells[0];
    const maskCell = cells[2];
    const netCell = cells[4];

    ipCell.innerHTML = '';
    ipCell.appendChild(createBitElements(ipBinary, i => i < cidr ? 'network' : 'host'));

    maskCell.innerHTML = '';
    maskCell.appendChild(createBitElements(maskBinary, i => i < cidr ? 'network' : 'host'));

    netCell.innerHTML = '';
    netCell.appendChild(createBitElements(networkBinary, i => i < cidr ? 'result-network' : 'result-host'));

    // Compute results
    const networkAddr = networkOctets.join('.');
    const broadcastOctets = networkOctets.map((o, i) => o | (~maskOctets[i] & 0xff));
    const broadcastAddr = broadcastOctets.join('.');

    const totalAddresses = Math.pow(2, 32 - cidr);
    let firstHost, lastHost, totalHosts;

    if (cidr === 32) {
        firstHost = networkAddr;
        lastHost = networkAddr;
        totalHosts = 1;
    } else if (cidr === 31) {
        firstHost = networkAddr;
        lastHost = broadcastAddr;
        totalHosts = 2;
    } else {
        const firstHostOctets = [...networkOctets];
        firstHostOctets[3] += 1;
        firstHost = firstHostOctets.join('.');

        const lastHostOctets = [...broadcastOctets];
        lastHostOctets[3] -= 1;
        lastHost = lastHostOctets.join('.');

        totalHosts = totalAddresses - 2;
    }

    const dds = document.querySelectorAll('#results dd');
    dds[0].textContent = networkAddr;
    dds[1].textContent = broadcastAddr;
    dds[2].textContent = firstHost;
    dds[3].textContent = lastHost;
    dds[4].textContent = totalHosts.toLocaleString();
}

// ── Event Listeners ──

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#inputs fieldset:first-of-type input').forEach(input => {
        input.addEventListener('input', () => {
            let val = parseInt(input.value);
            if (isNaN(val)) val = 0;
            if (val > 255) input.value = 255;
            if (val < 0) input.value = 0;
            update();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === '.') {
                e.preventDefault();
                const next = input.closest('fieldset').querySelector(
                    `input[data-octet="${parseInt(input.dataset.octet) + 1}"]`
                );
                if (next) next.focus();
            }
        });
    });

    document.querySelector('#inputs input[type="range"]').addEventListener('input', update);

    update();
});