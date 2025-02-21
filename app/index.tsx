import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

const index = () => {
  return (
    <View>
      <Text style={styles.container}>index</Text>
      <StatusBar style="auto" />
      <Link href="/profile">Go</Link>
    </View>
  )
}

export default index

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  }
})