
export default function Footer() {
  return (
    <footer className="bg-neutral-950 text-gray-400 border-t border-white/10 py-4 text-center text-sm">
      © {new Date().getFullYear()} InventoryApp. All rights reserved.
    </footer>
  );
}
