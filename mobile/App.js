// Native WENDROPS Mobile App
import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Image,
  Alert,
  Linking
} from 'react-native';

export default function App() {
  const [airdrops, setAirdrops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAirdrops();
  }, []);

  const fetchAirdrops = async () => {
    try {
      const response = await fetch('https://wendrops-airdrop.vercel.app/api/airdrops');
      const data = await response.json();
      if (data.success) {
        setAirdrops(data.airdrops.slice(0, 10)); // Show first 10
      }
    } catch (error) {
      console.error('Failed to fetch airdrops:', error);
    } finally {
      setLoading(false);
    }
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
        <TouchableOpacity style={[styles.navButton, styles.activeNav]}>
          <Text style={[styles.navText, styles.activeNavText]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navText}>Wallet Analysis</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navText}>Points System</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Latest Airdrops</Text>
        
        {loading ? (
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
