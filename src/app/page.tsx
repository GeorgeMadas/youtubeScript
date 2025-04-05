import DeepContent from '@/components/DeepContent';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">DeepContent</h1>
        <DeepContent />
      </div>
    </main>
  );
}
