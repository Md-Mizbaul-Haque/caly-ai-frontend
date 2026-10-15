import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import Card from '../shared/components/ui/Card';
import ScreenHeader from '../shared/components/ui/ScreenHeader';
import { Rocket } from '../shared/components/ui/icons';
import { toastSuccess } from '../shared/utils/toast';

export default function SnappyEarlyAccessScreen() {
  const [optedIn, setOptedIn] = useState(false);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Snappy Early Access" subtitle="Try new features before anyone else" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Card>
            <View className="items-center py-4">
              <View
                className="w-14 h-14 rounded-full items-center justify-center mb-3 bg-muted"
              >
                 <Rocket size={24} color="#f2470c" />
              </View>
              <Text className="text-[16px] font-bold text-ink mb-1">Snappy Early Access</Text>
              <Text className="text-[13px] text-muted-foreground text-center mb-4">
                Get experimental features first — smarter meal recognition, new charts, and more. Early features may be unstable.
              </Text>
              <View className="w-full flex-row items-center justify-between bg-input rounded-xl px-4 py-3">
                <Text className="text-[15px] font-semibold text-ink">Join early access</Text>
                <Switch
                  value={optedIn}
                  accessibilityLabel="Join early access"
                  onValueChange={(v) => {
                    setOptedIn(v);
                    toastSuccess(
                      v ? 'Welcome aboard!' : 'Opted out',
                      v ? 'You will get new features first' : 'You are back on the stable version'
                    );
                  }}
                />
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
