async function testGetOrders() {
  const url = 'https://www.wallcraftthailand.com/api/v1/orders';
  console.log('Fetching', url, '...');
  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('customer_types count:', data.customer_types?.length);
    console.log('customer_types:', JSON.stringify(data.customer_types, null, 2));
    console.log('projects count:', data.projects?.length);
    console.log('project_types count:', data.project_types?.length);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testGetOrders();
