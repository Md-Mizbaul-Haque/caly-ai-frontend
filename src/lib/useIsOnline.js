import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useIsOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => setOnline(s.isConnected !== false));
    NetInfo.fetch().then((s) => setOnline(s.isConnected !== false));
    return unsub;
  }, []);
  return online;
}
