const EmptyState = ({ message }) => (
  <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
    {message || "Nothing here yet."}
  </p>
);

export default EmptyState;
