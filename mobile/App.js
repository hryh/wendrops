// Native WENDROPS Mobile App with Navigation
import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Alert,
  Linking,
  TextInput,
  RefreshControl
} from 'react-native';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [airdrops, setAirdrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletAnalysis, setWalletAnalysis] = useState(null);
  const [pointsData, setPointsData] = useState({
    walletConnected: false,
    walletAddress: '',
    points: 0,
    quests: []
  });

  useEffect(() => {
    if (currentScreen === 'home') {
      fetchAirdrops();
    }
  }, [currentScreen]);

  const fetchAirdrops = async () => {
    try {
      setLoading(true);
      console.log('Fetching airdrops...');
      const baseUrl = 'https://wendrops-airdrop.vercel.app';
      const response = await fetch(`${baseUrl}/api/airdrops`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response:', data);
      
      if (data.success && Array.isArray(data.airdrops)) {
        setAirdrops(data.airdrops.slice(0, 10)); // Show first 10
        console.log('Loaded airdrops:', data.airdrops.length);
      } else {
        // Fallback to static data if API fails
        console.log('API returned no airdrops, using fallback data');
        setAirdrops([
          {
            id: '1',
            name: 'EigenLayer',
            status: 'Live',
            chain: 'Ethereum',
            rewardUSD: 1500,
            description: 'Restaking protocol for Ethereum security',
            links: { website: 'https://eigenlayer.xyz' }
          },
          {
            id: '2', 
            name: 'LayerZero',
            status: 'Upcoming',
            chain: 'Multi-Chain',
            rewardUSD: 2000,
            description: 'Omnichain interoperability protocol',
            links: { website: 'https://layerzero.network' }
          },
          {
            id: '3',
            name: 'Celestia',
            status: 'Live',
            chain: 'Celestia',
            rewardUSD: 800,
            description: 'Modular blockchain network',
            links: { website: 'https://celestia.org' }
          },
          {
            id: '4',
            name: 'Starknet',
            status: 'Live',
            chain: 'Starknet',
            rewardUSD: 1200,
            description: 'Zero-knowledge rollup for Ethereum',
            links: { website: 'https://starknet.io' }
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch airdrops:', error);
      // Use fallback data on error
      setAirdrops([
        {
          id: 'fallback-1',
          name: 'EigenLayer',
          status: 'Live',
          chain: 'Ethereum',
          rewardUSD: 1500,
          description: 'Restaking protocol for Ethereum security',
          links: { website: 'https://eigenlayer.xyz' }
        },
        {
          id: 'fallback-2', 
          name: 'LayerZero',
          status: 'Upcoming',
          chain: 'Multi-Chain',
          rewardUSD: 2000,
          description: 'Omnichain interoperability protocol',
          links: { website: 'https://layerzero.network' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeWallet = async () => {
    if (!walletAddress.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    try {
      setLoading(true);
      const baseUrl = 'https://wendrops-airdrop.vercel.app';
      const response = await fetch(`${baseUrl}/api/wallet-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: walletAddress.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setWalletAnalysis(data);
    } catch (error) {
      console.error('Wallet analysis failed:', error);
      // Mock data for demo
      setWalletAnalysis({
        address: walletAddress,
        balance: '2.45 ETH',
        transactions: 127,
        airdropEligibility: [
          { project: 'EigenLayer', eligible: true, reason: 'Active restaker' },
          { project: 'LayerZero', eligible: true, reason: 'Cross-chain user' },
          { project: 'Starknet', eligible: false, reason: 'No activity' }
        ],
        riskScore: 'Low',
        recommendation: 'Good airdrop potential. Consider more DeFi activity.'
      });
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = () => {
    // Mock wallet connection for demo
    const mockAddress = '0x742d35Cc6635C0532925a3b8D6Ac6E2f0';
    setPointsData({
      walletConnected: true,
      walletAddress: mockAddress,
      points: 1250,
      quests: [
        { name: 'Connect Wallet', completed: true, points: 50 },
        { name: 'Follow @WENDROPS', completed: true, points: 100 },
        { name: 'Join Discord', completed: false, points: 150 },
        { name: 'Share on X', completed: false, points: 200 }
      ]
    });
    Alert.alert('Wallet Connected', `Connected: ${mockAddress.substring(0, 6)}...${mockAddress.substring(mockAddress.length - 4)}`);
  };

  const disconnectWallet = () => {
    setPointsData({
      walletConnected: false,
      walletAddress: '',
      points: 0,
      quests: []
    });
    Alert.alert('Wallet Disconnected', 'Wallet has been disconnected');
  };

  const openAirdrop = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const renderAirdropCard = (airdrop) => (
    <TouchableOpacity 
      key={airdrop.id} 
      style={styles.airdropCard}
      onPress={() => openAirdrop(airdrop.links?.website)}
    >
      <View style={styles.airdropHeader}>
        <Text style={styles.airdropName}>{airdrop.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(airdrop.status) }]}>
          <Text style={styles.statusText}>{airdrop.status}</Text>
        </View>
      </View>
      <Text style={styles.airdropChain}>Chain: {airdrop.chain}</Text>
      <Text style={styles.airdropReward}>Reward: ${airdrop.rewardUSD}</Text>
      {airdrop.description && (
        <Text style={styles.airdropDescription} numberOfLines={2}>
          {airdrop.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'live': return '#10B981';
      case 'upcoming': return '#F59E0B';
      case 'ended': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderHomeScreen = () => (
    <ScrollView 
      style={styles.content} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchAirdrops} />
      }
    >
      <Text style={styles.sectionTitle}>Latest Airdrops</Text>
      
      {loading && airdrops.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading airdrops...</Text>
        </View>
      ) : (
        <View style={styles.airdropsList}>
          {airdrops.map(renderAirdropCard)}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 WENDROPS. All rights reserved.</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://wendrops-airdrop.vercel.app/terms.html')}>
          <Text style={styles.footerLink}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderWalletAnalysisScreen = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Wallet Analysis</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Wallet Address</Text>
        <TextInput
          style={styles.textInput}
          value={walletAddress}
          onChangeText={setWalletAddress}
          placeholder="0x..."
          placeholderTextColor="rgba(255,255,255,0.5)"
        />
        <TouchableOpacity 
          style={styles.analyzeButton} 
          onPress={analyzeWallet}
          disabled={loading}
        >
          <Text style={styles.analyzeButtonText}>
            {loading ? 'Analyzing...' : 'Analyze Wallet'}
          </Text>
        </TouchableOpacity>
      </View>

      {walletAnalysis && (
        <View style={styles.analysisResults}>
          <Text style={styles.resultsTitle}>Analysis Results</Text>
          
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Address</Text>
            <Text style={styles.resultValue}>{walletAnalysis.address}</Text>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Balance</Text>
            <Text style={styles.resultValue}>{walletAnalysis.balance}</Text>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Transactions</Text>
            <Text style={styles.resultValue}>{walletAnalysis.transactions}</Text>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Risk Score</Text>
            <Text style={[styles.resultValue, { color: '#10B981' }]}>
              {walletAnalysis.riskScore}
            </Text>
          </View>

          <Text style={styles.eligibilityTitle}>Airdrop Eligibility</Text>
          {walletAnalysis.airdropEligibility?.map((item, index) => (
            <View key={index} style={styles.eligibilityCard}>
              <Text style={styles.projectName}>{item.project}</Text>
              <View style={styles.eligibilityRow}>
                <Text style={[styles.eligibilityStatus, { 
                  color: item.eligible ? '#10B981' : '#EF4444' 
                }]}>
                  {item.eligible ? 'Eligible' : 'Not Eligible'}
                </Text>
                <Text style={styles.eligibilityReason}>{item.reason}</Text>
              </View>
            </View>
          ))}

          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationTitle}>Recommendation</Text>
            <Text style={styles.recommendationText}>{walletAnalysis.recommendation}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderPointsSystemScreen = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Points System</Text>
      
      {!pointsData.walletConnected ? (
        <View style={styles.connectContainer}>
          <Text style={styles.connectTitle}>Connect Your Wallet</Text>
          <Text style={styles.connectDescription}>
            Connect your wallet to start earning points and participating in quests.
          </Text>
          <TouchableOpacity style={styles.connectButton} onPress={connectWallet}>
            <Text style={styles.connectButtonText}>Connect Wallet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.pointsContainer}>
          <View style={styles.pointsHeader}>
            <Text style={styles.pointsTitle}>Your Points</Text>
            <Text style={styles.pointsValue}>{pointsData.points.toLocaleString()}</Text>
          </View>

          <View style={styles.walletInfo}>
            <Text style={styles.walletLabel}>Connected Wallet</Text>
            <Text style={styles.walletAddress}>
              {pointsData.walletAddress.substring(0, 6)}...{pointsData.walletAddress.substring(pointsData.walletAddress.length - 4)}
            </Text>
          </View>

          <TouchableOpacity style={styles.disconnectButton} onPress={disconnectWallet}>
            <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
          </TouchableOpacity>

          <Text style={styles.questsTitle}>Available Quests</Text>
          {pointsData.quests.map((quest, index) => (
            <View key={index} style={styles.questCard}>
              <View style={styles.questHeader}>
                <Text style={styles.questName}>{quest.name}</Text>
                <Text style={styles.questPoints}>+{quest.points} pts</Text>
              </View>
              <View style={[styles.questStatus, { 
                backgroundColor: quest.completed ? '#10B981' : '#6B7280' 
              }]}>
                <Text style={styles.questStatusText}>
                  {quest.completed ? 'Completed' : 'Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'home':
        return renderHomeScreen();
      case 'wallet':
        return renderWalletAnalysisScreen();
      case 'points':
        return renderPointsSystemScreen();
      default:
        return renderHomeScreen();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1020" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>W</Text>
          </View>
          <Text style={styles.title}>WENDROPS</Text>
          <Text style={styles.proBadge}>Pro</Text>
        </View>
        <Text style={styles.subtitle}>Crypto-Native Discovery · Multi-Chain</Text>
      </View>

      {/* Navigation */}
      <View style={styles.navContainer}>
        <TouchableOpacity 
          style={[styles.navButton, currentScreen === 'home' && styles.activeNav]}
          onPress={() => setCurrentScreen('home')}
        >
          <Text style={[styles.navText, currentScreen === 'home' && styles.activeNavText]}>
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, currentScreen === 'wallet' && styles.activeNav]}
          onPress={() => setCurrentScreen('wallet')}
        >
          <Text style={[styles.navText, currentScreen === 'wallet' && styles.activeNavText]}>
            Wallet Analysis
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, currentScreen === 'points' && styles.activeNav]}
          onPress={() => setCurrentScreen('points')}
        >
          <Text style={[styles.navText, currentScreen === 'points' && styles.activeNavText]}>
            Points System
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {renderCurrentScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1020',
  },
  header: {
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#22D3EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  proBadge: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  navContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  activeNav: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  navText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  activeNavText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  airdropsList: {
    gap: 12,
  },
  airdropCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  airdropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  airdropName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  airdropChain: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  airdropReward: {
    fontSize: 14,
    color: '#22D3EE',
    fontWeight: '600',
    marginBottom: 8,
  },
  airdropDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  // Wallet Analysis Styles
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  analyzeButton: {
    backgroundColor: '#22D3EE',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  analysisResults: {
    gap: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  resultLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  resultValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  eligibilityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 12,
  },
  eligibilityCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  projectName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  eligibilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eligibilityStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  eligibilityReason: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  recommendationCard: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#22D3EE',
    marginTop: 8,
  },
  recommendationTitle: {
    color: '#22D3EE',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  // Points System Styles
  connectContainer: {
    alignItems: 'center',
    padding: 40,
  },
  connectTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  connectDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#22D3EE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  pointsContainer: {
    gap: 16,
  },
  pointsHeader: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22D3EE',
  },
  pointsTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  pointsValue: {
    color: '#22D3EE',
    fontSize: 32,
    fontWeight: 'bold',
  },
  walletInfo: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  walletAddress: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  disconnectButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  questsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  questCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  questPoints: {
    color: '#22D3EE',
    fontSize: 14,
    fontWeight: '600',
  },
  questStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  questStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 8,
  },
  footerLink: {
    color: '#22D3EE',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});