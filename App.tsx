import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ProjectsScreen } from './ProjectsScreen';
import { ShotsScreen } from './ShotsScreen';
import { colors } from './theme';
import { useStore } from './useStore';

export default function App() {
  const store = useStore();
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);

  // Falling back to the project list covers a project deleted while it was open.
  const openProject = store.projects.find((p) => p.id === openProjectId) ?? null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        {openProject ? (
          <ShotsScreen project={openProject} store={store} onBack={() => setOpenProjectId(null)} />
        ) : (
          <ProjectsScreen store={store} onOpenProject={setOpenProjectId} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
