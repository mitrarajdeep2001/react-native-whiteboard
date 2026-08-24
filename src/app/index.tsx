import { BoardContextMenu } from "@/components/boards/BoardContextMenu";
import { NewBoardModal } from "@/components/boards/NewBoardModal";
import { useBoards } from "@/hooks/useBoards";
import { Board } from "@/types/whiteboard";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function HomeScreen() {
  const { boards, loading, createBoard, deleteBoard, renameBoard, refreshBoards } =
    useBoards();

  const [newBoardVisible, setNewBoardVisible] = useState(false);
  const [contextBoard, setContextBoard] = useState<Board | null>(null);

  // Refresh list whenever this screen comes into focus (e.g. after leaving a board)
  useFocusEffect(
    useCallback(() => {
      refreshBoards();
    }, [refreshBoards])
  );

  const handleCreate = async (name: string) => {
    setNewBoardVisible(false);
    const board = await createBoard(name);
    router.push(`/board/${board.id}` as any);
  };

  const handleDelete = (board: Board) => {
    Alert.alert(
      "Delete Board",
      `Are you sure you want to delete "${board.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteBoard(board.id),
        },
      ]
    );
  };

  const handleRename = async (id: string, name: string) => {
    await renameBoard(id, name);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const renderItem = ({ item }: { item: Board }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/board/${item.id}` as any)}
      onLongPress={() => setContextBoard(item)}
      accessibilityRole="button"
      accessibilityLabel={`Open board ${item.name}`}
      accessibilityHint="Long press for options"
    >
      {/* Thumbnail */}
      <View style={styles.thumbnail}>
        {item.thumbnail ? (
          <Image
            source={{ uri: `data:image/png;base64,${item.thumbnail}` }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailPlaceholderIcon}>✏️</Text>
          </View>
        )}
      </View>
      {/* Info row */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardDate}>{formatDate(item.updatedAt)}</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Boards</Text>
        <Pressable
          style={styles.newBtn}
          onPress={() => setNewBoardVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Create new board"
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : boards.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🎨</Text>
          <Text style={styles.emptyTitle}>No boards yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap &quot;+ New&quot; to create your first whiteboard
          </Text>
        </View>
      ) : (
        <FlatList
          data={boards}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* New board modal */}
      <NewBoardModal
        visible={newBoardVisible}
        onConfirm={handleCreate}
        onClose={() => setNewBoardVisible(false)}
      />

      {/* Context menu (rename / delete) */}
      {contextBoard && (
        <BoardContextMenu
          visible={!!contextBoard}
          boardName={contextBoard.name}
          onRename={(name) => {
            handleRename(contextBoard.id, name);
            setContextBoard(null);
          }}
          onDelete={() => {
            handleDelete(contextBoard);
            setContextBoard(null);
          }}
          onClose={() => setContextBoard(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  newBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    maxWidth: 240,
  },
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.85,
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#f3f4f6",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
  },
  thumbnailPlaceholderIcon: {
    fontSize: 32,
  },
  cardInfo: {
    padding: 10,
    gap: 2,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  cardDate: {
    fontSize: 11,
    color: "#9ca3af",
  },
});
