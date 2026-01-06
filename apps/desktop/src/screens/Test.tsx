export default function Test() {
  return (
    <div style={{ 
      background: '#0A0E14', 
      color: 'white', 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold' }}>✅ React is Working!</h1>
      <p>If you see this, React is rendering correctly.</p>
      <p style={{ color: '#0066FF' }}>The issue might be with Tailwind CSS or routing.</p>
    </div>
  );
}
