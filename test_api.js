async function test() {
    try {
        console.log('Testing /api/finance/005930...');
        const res = await fetch('http://localhost:3000/api/finance/005930');
        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Has output:', data.output ? 'YES' : 'NO');
        if (data.output && data.output[0]) {
            console.log('First day data:', data.output[0]);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
