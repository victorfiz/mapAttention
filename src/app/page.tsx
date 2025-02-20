import AttentionDisplay from '@/components/AttentionDisplay';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <main className="w-full max-w-4xl p-4">
        <h1 className="text-2xl font-bold text-center mb-8 text-black">
          Attention Visualization
        </h1>
        <AttentionDisplay />
      </main>
    </div>
  );
}
