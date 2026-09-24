async function testGetCompanies() {
  const url = 'https://www.wallcraftthailand.com/api/v1/companies?q=FAY';
  console.log('Fetching', url, '...');
  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Companies:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testGetCompanies();
