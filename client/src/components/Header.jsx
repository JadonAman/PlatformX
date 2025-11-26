function Header({ title, subtitle }) {
  return (
    <div className="bg-gradient-to-r from-white via-white to-gray-50 border-b border-gray-200 px-8 py-8 mb-6 shadow-soft">
      <div className="max-w-7xl">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-600 mt-2 text-lg font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default Header;
