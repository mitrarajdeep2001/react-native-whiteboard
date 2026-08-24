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
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { boards, loading, createBoard, deleteBoard, renameBoard, refreshBoards } =
    useBoards();

  const [newBoardVisible, setNewBoardVisible] = useState(false);
  const [contextBoard, setContextBoard] = useState<Board | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "name">("updated");

  const { width } = useWindowDimensions();
  // Dynamic columns: phone: 2, tablet: 3, landscape/desktop: 4 or 5
  const numColumns = width < 600 ? 2 : width < 900 ? 3 : width < 1200 ? 4 : 5;

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

  // Filter and sort boards
  const filteredBoards = boards
    .filter((board) =>
      board.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return b.updatedAt - a.updatedAt; // default: newest updated first
    });

  const renderItem = ({ item }: { item: Board }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/board/${item.id}` as any)}
      onLongPress={() => setContextBoard(item)}
      accessibilityRole="link"
      accessibilityLabel={`Open board ${item.name}`}
      accessibilityHint="Double tap to open, long press for options"
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
            {/* Grid pattern background lines */}
            <View style={styles.gridLinesContainer}>
              <View style={[styles.gridLineH, { top: '25%' }]} />
              <View style={[styles.gridLineH, { top: '50%' }]} />
              <View style={[styles.gridLineH, { top: '75%' }]} />
              <View style={[styles.gridLineV, { left: '25%' }]} />
              <View style={[styles.gridLineV, { left: '50%' }]} />
              <View style={[styles.gridLineV, { left: '75%' }]} />
            </View>
            
            {/* Decorative sketch elements simulating a whiteboard */}
            <View style={styles.placeholderMockSticky}>
              <Text style={styles.placeholderMockStickyText}>Idea</Text>
            </View>
            <View style={styles.placeholderMockCircle} />
            <View style={styles.placeholderMockLine} />
            
            {/* Drawing emoji indicator */}
            <View style={styles.placeholderIconContainer}>
              <Text style={styles.thumbnailPlaceholderIcon}>✏️</Text>
            </View>
          </View>
        )}
      </View>
      {/* Info row with three-dot actions button */}
      <View style={styles.cardInfo}>
        <View style={styles.cardTextContent}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardDate}>{formatDate(item.updatedAt)}</Text>
            <Text style={styles.cardMetaSeparator}>•</Text>
            <Text style={styles.cardCount}>
              {item.elements && item.elements.length > 0 
                ? `${item.elements.length} item${item.elements.length === 1 ? "" : "s"}`
                : "Empty"}
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.moreBtn, pressed && styles.moreBtnPressed]}
          onPress={() => setContextBoard(item)}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${item.name}`}
        >
          <Text style={styles.moreBtnText}>•••</Text>
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>My Boards</Text>
          {!loading && boards.length > 0 && (
            <Text style={styles.headerSubtitle}>
              {boards.length} board{boards.length === 1 ? "" : "s"}
            </Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.newBtn, pressed && styles.newBtnPressed]}
          onPress={() => setNewBoardVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Create new board"
        >
          <Text style={styles.newBtnText}>+ New Board</Text>
        </Pressable>
      </View>

      {/* Search and Filters */}
      {!loading && boards.length > 0 && (
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchText}>✕</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.sortControls}>
            <Pressable
              style={[styles.sortBtn, sortBy === "updated" && styles.sortBtnActive]}
              onPress={() => setSortBy("updated")}
            >
              <Text style={[styles.sortBtnText, sortBy === "updated" && styles.sortBtnTextActive]}>
                🕒 Recent
              </Text>
            </Pressable>
            <Pressable
              style={[styles.sortBtn, sortBy === "name" && styles.sortBtnActive]}
              onPress={() => setSortBy("name")}
            >
              <Text style={[styles.sortBtnText, sortBy === "name" && styles.sortBtnTextActive]}>
                🔤 Name
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading whiteboards...</Text>
          </View>
        ) : boards.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIllustration}>
              <View style={styles.illustrationGridH} />
              <View style={styles.illustrationGridV} />
              <Text style={styles.emptyIcon}>🎨</Text>
            </View>
            <Text style={styles.emptyTitle}>Create your first whiteboard</Text>
            <Text style={styles.emptySubtitle}>
              Tap the button below or &quot;+ New Board&quot; at the top to sketch, brainstorm, and take notes.
            </Text>
            <Pressable
              style={styles.emptyCreateBtn}
              onPress={() => setNewBoardVisible(true)}
            >
              <Text style={styles.emptyCreateBtnText}>+ Create Board</Text>
            </Pressable>
          </View>
        ) : filteredBoards.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No matching boards</Text>
            <Text style={styles.emptySubtitle}>
              No board matches &quot;{searchQuery}&quot;. Try adjusting your search query.
            </Text>
            <Pressable
              style={styles.clearSearchFilterBtn}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles.clearSearchFilterText}>Clear Search</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            key={numColumns}
            data={filteredBoards}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={numColumns}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

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
    backgroundColor: "#f8fafc", // Premium background color
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitleContainer: {
    flexDirection: "column",
    gap: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
  },
  newBtn: {
    backgroundColor: "#2563eb", // Premium blue accent
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  newBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  newBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  searchFilterContainer: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: "#64748b",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "bold",
  },
  sortControls: {
    flexDirection: "row",
    gap: 8,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sortBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  sortBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
  },
  sortBtnTextActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: "#64748b",
    marginTop: 4,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    backgroundColor: "#f1f5f9",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
  },
  illustrationGridH: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: "#cbd5e1",
  },
  illustrationGridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
    backgroundColor: "#cbd5e1",
  },
  emptyIcon: {
    fontSize: 48,
    zIndex: 1,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyCreateBtn: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyCreateBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  clearSearchFilterBtn: {
    marginTop: 12,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  clearSearchFilterText: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    alignSelf: "center",
    width: "100%",
    maxWidth: 1200,
  },
  columnWrapper: {
    gap: 16,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 1.4,
    backgroundColor: "#f8fafc",
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fdfdfd",
  },
  gridLinesContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.08,
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#0f172a",
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#0f172a",
  },
  placeholderMockSticky: {
    position: "absolute",
    top: "12%",
    left: "12%",
    width: "35%",
    height: "35%",
    backgroundColor: "#fef08a",
    borderRadius: 4,
    transform: [{ rotate: "-6deg" }],
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  placeholderMockStickyText: {
    fontSize: 9,
    color: "#713f12",
    fontWeight: "700",
  },
  placeholderMockCircle: {
    position: "absolute",
    bottom: "15%",
    right: "12%",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderStyle: "dashed",
  },
  placeholderMockLine: {
    position: "absolute",
    top: "28%",
    right: "22%",
    width: "36%",
    height: 2,
    backgroundColor: "#ef4444",
    transform: [{ rotate: "25deg" }],
  },
  placeholderIconContainer: {
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 2,
  },
  thumbnailPlaceholderIcon: {
    fontSize: 24,
  },
  cardInfo: {
    flexDirection: "row",
    padding: 14,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTextContent: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardDate: {
    fontSize: 12,
    color: "#64748b",
  },
  cardMetaSeparator: {
    fontSize: 10,
    color: "#94a3b8",
  },
  cardCount: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  moreBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  moreBtnPressed: {
    backgroundColor: "#e2e8f0",
  },
  moreBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748b",
    letterSpacing: -1,
  },
});
