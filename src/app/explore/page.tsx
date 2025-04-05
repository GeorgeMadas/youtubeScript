export default function ExplorePage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Explore GPTs</h1>
        <p className="text-center mb-8">Discover and use specialized GPTs for different tasks</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Example GPT cards would go here */}
          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-2">Research Assistant</h3>
            <p className="text-gray-600 mb-4">Helps with academic research and citations</p>
          </div>
          
          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-2">Content Writer</h3>
            <p className="text-gray-600 mb-4">Creates engaging blog posts and articles</p>
          </div>
        </div>
      </div>
    </main>
  );
} 