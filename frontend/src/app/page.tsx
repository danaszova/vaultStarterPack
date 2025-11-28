import CreateVaultForm from '@/components/CreateVaultForm';
import VaultList from '@/components/VaultList';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="text-center space-y-4 py-12">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Cross-Chain Strategy Vaults
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Automate your DeFi strategies across chains. Deploy on Avalanche, execute on Ethereum.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <CreateVaultForm />
        </div>
        <div className="lg:col-span-2">
          <VaultList />
        </div>
      </div>
    </div>
  );
}
