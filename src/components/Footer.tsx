export default function Footer() {
  return (
    <footer className="flex items-center justify-between px-6 py-4 text-xs mt-auto" style={{ borderTop: '1px solid #1e1e1e', color: '#555' }}>
      <div>
        Powered by <span className="font-bold" style={{ color: '#ff2eeb' }}>ORRJO</span>
      </div>
      <div>Data refreshes automatically every 30 seconds</div>
    </footer>
  );
}
