function Header({ title, subtitle }) {
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-6 mb-6">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-gray-600 mt-2">{subtitle}</p>}
    </div>
  );
}

export default Header;
