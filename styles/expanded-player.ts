import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

export const expandedPlayerStyles = StyleSheet.create({
    rootContainer: {
        flex: 1,
        height: isAndroid ? height : '100%',
        width: isAndroid ? width : '100%',
        borderTopLeftRadius: isAndroid ? 0 : 12,
        borderTopRightRadius: isAndroid ? 0 : 12,
        overflow: 'hidden',
        backgroundColor: isAndroid ? '#000000' : 'rgba(15, 15, 15, 0.85)',
        ...(Platform.OS === 'android' && {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
        }),
    },
    scrollView: {
        flex: 1,
        width: '100%',
        ...(Platform.OS === 'android' && {
            minHeight: height,
            height: height,
            backgroundColor: '#000000',
        }),
    },
    videoContainer: {
        width: '100%',
        height: 250,
        position: 'relative',
        backgroundColor: '#000',
        ...(Platform.OS === 'android' && {
            height: 300,
            width: width,
            paddingTop: 0,
            marginTop: 0,
            zIndex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
        }),
    },
    video: {
        width: '100%',
        height: '100%',
        ...(Platform.OS === 'android' && {
            width: width,
            height: width * (9/16),
            backgroundColor: '#000',
            aspectRatio: undefined
        }),
    },
    videoOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: Platform.OS === 'android' ? 36 : 0,
        zIndex: 2,
    },
    videoQualityBadge: {
        position: 'absolute',
        width: 50,
        height: 14,
        left: 73,
        top: 16,
        borderWidth: 1,
        borderColor: '#575757',
        borderRadius: 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    videoQualityText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: 'bold',
    },
    muteOverlay: {
        position: 'absolute',
        bottom: 16,
        right: 16,
    },
    closeButton: {
        backgroundColor: '#000000bb',
        width: Platform.OS === 'android' ? 32 : 36,
        height: Platform.OS === 'android' ? 32 : 36,
        borderRadius: Platform.OS === 'android' ? 16 : 20,
        justifyContent: 'center',
        alignItems: 'center',
        right: 10,
        top: Platform.OS === 'android' ? 8 : 10,
        ...(Platform.OS === 'android' && {
            display: 'none'
        }),
    },
    soundButton: {
        backgroundColor: '#000000bb',
        width: 28,
        height: 28,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        // marginRight: 6,
    },
    contentContainer: {
        padding: Platform.OS === 'android' ? 12 : 16,
        backgroundColor: Platform.OS === 'android' ? '#000000' : 'transparent',
    },
    title: {
        paddingTop: Platform.OS === 'android' ? 2 : 4,
        fontSize: Platform.OS === 'android' ? 20 : 22,
        fontWeight: Platform.OS === 'android' ? '500' : 'bold',
        marginBottom: Platform.OS === 'android' ? 10 : 12,
        color: '#fff',
        letterSpacing: Platform.OS === 'android' ? 0.15 : undefined,
    },
    metaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Platform.OS === 'android' ? 8 : 8,
        gap: Platform.OS === 'android' ? 12 : 8,
    },
    year: {
        fontSize: Platform.OS === 'android' ? 13 : 14,
        color: 'rgba(255, 255, 255, 0.7)',
        letterSpacing: Platform.OS === 'android' ? 0.25 : undefined,
    },
    duration: {
        fontSize: Platform.OS === 'android' ? 13 : 14,
        color: 'rgba(255, 255, 255, 0.7)',
        letterSpacing: Platform.OS === 'android' ? 0.25 : undefined,
    },
    rating: {
        fontSize: Platform.OS === 'android' ? 13 : 14,
        color: 'rgba(255, 255, 255, 0.9)',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        letterSpacing: Platform.OS === 'android' ? 0.25 : undefined,
    },
    quality: {
        fontSize: Platform.OS === 'android' ? 12 : 14,
        color: '#999',
        backgroundColor: '#333',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    genreInfo: {
        marginBottom: Platform.OS === 'android' ? 12 : 16,
        marginTop: Platform.OS === 'android' ? -8 : -10,
    },
    genreText: {
        fontSize: Platform.OS === 'android' ? 12 : 14,
        color: '#999',
    },
    buttonContainer: {
        flexDirection: 'column',
        gap: Platform.OS === 'android' ? 8 : 12,
        marginBottom: Platform.OS === 'android' ? 12 : 16,
    },
    playButton: {
        flex: 1,
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Platform.OS === 'android' ? 6 : 8,
        borderRadius: 4,
        gap: 8,
    },
    playButtonText: {
        color: 'black',
        fontSize: Platform.OS === 'android' ? 14 : 16,
        fontWeight: 'bold',
    },
    downloadButton: {
        flex: 1,
        backgroundColor: '#333',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Platform.OS === 'android' ? 6 : 8,
        borderRadius: 4,
        gap: 8,
    },
    downloadButtonText: {
        color: 'white',
        fontSize: Platform.OS === 'android' ? 14 : 16,
        fontWeight: 'bold',
    },
    description: {
        fontSize: Platform.OS === 'android' ? 14 : 14,
        lineHeight: Platform.OS === 'android' ? 20 : 20,
        marginBottom: Platform.OS === 'android' ? 16 : 16,
        color: 'rgba(255, 255, 255, 0.87)',
        letterSpacing: Platform.OS === 'android' ? 0.25 : undefined,
    },
    castInfo: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    castLabel: {
        color: '#999',
        fontSize: Platform.OS === 'android' ? 12 : 14,
    },
    castText: {
        flex: 1,
        color: '#999',
        fontSize: Platform.OS === 'android' ? 12 : 14,
    },
    directorInfo: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    directorLabel: {
        color: '#999',
        fontSize: Platform.OS === 'android' ? 12 : 14,
    },
    directorText: {
        flex: 1,
        color: '#999',
        fontSize: Platform.OS === 'android' ? 12 : 14,
    },
    actionButtons: {
        flexDirection: 'row',
        borderTopColor: '#333',
        gap: Platform.OS === 'android' ? 60 : 80,
        height: Platform.OS === 'android' ? 50 : 60,
    },
    actionButton: {
        alignItems: 'center',
        gap: 1,
        marginTop: -4
    },
    actionButtonText: {
        fontSize: Platform.OS === 'android' ? 10 : 11,
        color: '#fff',
    },
    moreLikeThis: {
        padding: 16,
        paddingTop: 0,
    },
    moreLikeThisTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#fff',
    },
    movieGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    moviePoster: {
        width: '31%',
        aspectRatio: 2 / 3,
        borderRadius: 4,
    },
    sliderContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: -2,
        height: 3,
        // paddingHorizontal: 16,
        justifyContent: 'center',
        // backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    slider: {
        width: '100%',
    },
    sliderInner: {
        backgroundColor: '#ffffff4a',
        borderWidth: 0,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#fff',
    },
    castContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    castName: {
        color: '#999',
        fontSize: 14,
    },
    episodeInfo: {
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    episodeTitle: {
        fontSize: Platform.OS === 'android' ? 16 : 16,
        fontWeight: Platform.OS === 'android' ? '500' : '600',
        color: '#fff',
        marginBottom: Platform.OS === 'android' ? 10 : 8,
        letterSpacing: Platform.OS === 'android' ? 0.15 : undefined,
    },
    episodeDescription: {
        fontSize: Platform.OS === 'android' ? 14 : 14,
        color: 'rgba(255, 255, 255, 0.87)',
        lineHeight: Platform.OS === 'android' ? 20 : 20,
        marginBottom: Platform.OS === 'android' ? 10 : 8,
        letterSpacing: Platform.OS === 'android' ? 0.25 : undefined,
    },
    episodeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    episodeMetaText: {
        fontSize: Platform.OS === 'android' ? 13 : 12,
        color: 'rgba(255, 255, 255, 0.6)',
        marginRight: Platform.OS === 'android' ? 12 : 8,
        letterSpacing: Platform.OS === 'android' ? 0.4 : undefined,
    },
    
    // Netflix-like tabs
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: Platform.OS === 'android' ? 12 : 16,
        borderBottomWidth: 2,
        borderBottomColor: '#333',
        marginTop: Platform.OS === 'android' ? 4 : 8,
    },
    tabButton: {
        paddingVertical: Platform.OS === 'android' ? 8 : 12,
        paddingHorizontal: Platform.OS === 'android' ? 12 : 16,
        marginRight: 8,
    },
    activeTabButton: {
        borderBottomWidth: 4,
        borderBottomColor: '#E50914',
        marginBottom: -2,
    },
    tabButtonText: {
        color: '#999',
        fontSize: Platform.OS === 'android' ? 12 : 14,
        fontWeight: '500',
    },
    activeTabButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    
    // Season selector
    seasonSelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    seasonSelectorText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    
    // Episodes list
    episodesContainer: {
        flex: 1,
    },
    episodesList: {
        paddingBottom: 16,
    },
    episodeItemContainer: {
        flexDirection: 'column',
        paddingVertical: 14,
        marginHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(40, 40, 40, 0.4)',
        marginBottom: 0,
    },
    episodeTopRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    episodeThumb: {
        width: 124,
        height: 70,
        backgroundColor: '#222',
        borderRadius: 2,
        marginRight: 14,
        overflow: 'hidden',
        position: 'relative',
    },
    episodeThumbImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    episodeHeader: {
        flex: 1,
        justifyContent: 'center',
    },
    episodeNumberText: {
        color: '#fff',
        fontSize: Platform.OS === 'android' ? 15 : 14,
        fontWeight: Platform.OS === 'android' ? '500' : '500',
        marginBottom: Platform.OS === 'android' ? 6 : 4,
        letterSpacing: Platform.OS === 'android' ? 0.15 : undefined,
    },
    episodeDurationText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: Platform.OS === 'android' ? 13 : 13,
        letterSpacing: Platform.OS === 'android' ? 0.4 : undefined,
    },
    episodeDescriptionText: {
        color: 'rgba(255, 255, 255, 0.87)',
        fontSize: Platform.OS === 'android' ? 14 : 13,
        lineHeight: Platform.OS === 'android' ? 20 : 18,
        paddingRight: 20,
        letterSpacing: Platform.OS === 'android' ? 0.25 : undefined,
    },
    selectedEpisodeItem: {
        backgroundColor: 'rgba(40, 40, 40, 0.3)',
        borderLeftWidth: 3,
        borderLeftColor: '#E50914',
        paddingLeft: 13,
        marginHorizontal: 0, // Override horizontal margin for selected item
    },
    selectedEpisodeNumberText: {
        color: '#fff',
        fontWeight: Platform.OS === 'android' ? '500' : 'bold',
        letterSpacing: Platform.OS === 'android' ? 0.15 : undefined,
    },
    selectedEpisodeDurationText: {
        color: 'rgba(255, 255, 255, 0.87)',
        letterSpacing: Platform.OS === 'android' ? 0.4 : undefined,
    },
    selectedEpisodeDescriptionText: {
        color: 'rgba(255, 255, 255, 0.87)',
        letterSpacing: Platform.OS === 'android' ? 0.25 : undefined,
    },
    episodePlayIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    episodeDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    findStreamsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E50914',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    findStreamsText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        color: '#999',
        fontSize: 14,
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    modalContent: {
        width: '85%',
        maxHeight: Platform.OS === 'android' ? '80%' : '70%',
        backgroundColor: '#181818',
        borderRadius: 8,
        padding: 16,
        elevation: 5, // Android shadow
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    seasonOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    selectedSeasonOption: {
        backgroundColor: '#E50914', // Red background for selected
    },
    seasonOptionText: {
        color: '#fff',
        fontSize: 16,
    },
    selectedSeasonOptionText: {
        color: '#fff', // White text for selected
        fontWeight: 'bold',
    },
    modalCloseButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
    },

    // Grid styles for Collection and More Like This
    gridContainer: {
        padding: 16,
        paddingHorizontal: 8, // Added horizontal padding
    },
    gridContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        // justifyContent: 'space-between', // Removed justifyContent
        gap: 18, // Increased gap further
    },
    gridItem: {
        width: '30%', // Slightly reduced width to accommodate increased gap
        marginBottom: 20, // Increased bottom margin
    },
    gridImage: { // Renamed from gridItemImage
        width: '100%',
        aspectRatio: 2/3,
        borderRadius: 14, // Changed from 4 to match home screen
        // marginBottom: 8, // Removed marginBottom
    },
    gridItemTitle: {
        color: '#fff',
        fontSize: 12,
        lineHeight: 16,
    },

    // Trailers styles
    trailersContainer: {
        padding: 16,
    },
    trailersList: {
        gap: 16,
    },
    trailerItem: {
        marginBottom: 16,
    },
    trailerThumbnail: {
        width: '100%',
        aspectRatio: 16/9,
        borderRadius: 4,
        marginBottom: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    trailerImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    playIconContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    trailerTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    trailerDuration: {
        color: '#999',
        fontSize: 12,
    },
    
    // Styles for Horizontal "More Like This" list
    horizontalListContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    horizontalListItem: {
        marginRight: 12,
        width: 120,
        height: 180,
    },
    horizontalListImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },

    // Streaming modal styles
    streamingModalContainer: {
        flex: 1,
        backgroundColor: Platform.OS === 'android' ? '#000000' : 'rgba(0, 0, 0, 0.5)',
        padding: Platform.select({
            android: 12,
            ios: 16,
            default: 16
        }),
        paddingTop: Platform.select({
            android: 0,
            ios: 72,
            default: 72
        }),
        paddingBottom: Platform.select({
            android: 16,
            ios: 32,
            default: 32
        }),
    },
    streamingModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Platform.OS === 'android' ? 8 : 10,
        paddingTop: Platform.OS === 'android' ? 12 : 6,
        height: Platform.OS === 'android' ? 56 : 'auto',
    },
    streamingModalTitle: {
        color: 'white',
        fontSize: Platform.OS === 'android' ? 18 : 20,
        fontWeight: Platform.OS === 'android' ? '500' : 'bold',
        marginLeft: Platform.OS === 'android' ? 4 : 0,
    },
    streamingModalCloseButton: {
        width: Platform.OS === 'android' ? 40 : 34,
        height: Platform.OS === 'android' ? 40 : 34,
        borderRadius: Platform.OS === 'android' ? 20 : 17,
        backgroundColor: Platform.OS === 'android' ? 'transparent' : 'rgba(40, 40, 40, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentTitleContainer: {
        marginBottom: Platform.OS === 'android' ? 12 : 16,
        paddingHorizontal: 2,
        borderLeftWidth: 3,
        borderLeftColor: '#E50914',
        paddingLeft: 10,
    },
    contentTitle: {
        color: Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.9)',
        fontSize: Platform.OS === 'android' ? 14 : 16,
        fontWeight: Platform.OS === 'android' ? '400' : '600',
        lineHeight: Platform.OS === 'android' ? 20 : undefined,
    },
    streamingModalContent: {
        flex: 1,
    },
    streamingModalContentContainer: {
        paddingBottom: Platform.OS === 'android' ? 12 : 20,
    },
    streamingModalLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 20,
    },
    streamingModalLoadingText: {
        color: 'white',
        marginTop: 10,
        fontSize: 16,
        marginBottom: 20,
    },
    streamingModalCancelButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
        marginTop: 10,
    },
    streamingModalCancelButtonText: {
        color: 'white',
        fontWeight: '500',
        fontSize: 16,
    },
    streamingModalError: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    streamingModalErrorText: {
        color: 'white',
        marginTop: 10,
        marginBottom: 20,
        fontSize: 16,
        textAlign: 'center',
    },
    streamingModalRetryButton: {
        backgroundColor: '#E50914',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    streamingModalRetryButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    streamingModalEmpty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    streamingModalEmptyText: {
        color: 'white',
        marginTop: 10,
        fontSize: 16,
        textAlign: 'center',
    },
    providerFilterContainer: {
        marginBottom: 12,
        maxHeight: 46,
    },
    providerFilterContent: {
        paddingBottom: 4,
        paddingHorizontal: 4,
    },
    providerFilterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: Platform.OS === 'android' ? '#000000' : 'rgba(30, 30, 30, 0.6)',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(100, 100, 100, 0.4)',
    },
    providerFilterChipSelected: {
        backgroundColor: '#E50914', // Keep this solid for visibility
        borderColor: '#E50914',
    },
    providerFilterText: {
        color: 'white',
        fontWeight: '500',
        fontSize: 14,
    },
    providerFilterTextSelected: {
        color: 'white',
        fontWeight: 'bold',
    },
    streamCard: {
        flexDirection: 'row',
        backgroundColor: Platform.OS === 'android' ? '#121212' : 'rgba(30, 30, 30, 0.7)',
        borderRadius: Platform.OS === 'android' ? 8 : 10,
        marginBottom: Platform.OS === 'android' ? 8 : 10,
        padding: Platform.OS === 'android' ? 12 : 14,
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        borderColor: 'rgba(60, 60, 60, 0.5)',
        ...(Platform.OS === 'android' && {
            elevation: 2,
        }),
    },
    streamCardLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
    },
    streamCardRight: {
        width: Platform.OS === 'android' ? 36 : 42,
        height: Platform.OS === 'android' ? 36 : 42,
        borderRadius: Platform.OS === 'android' ? 18 : 21,
        backgroundColor: '#E50914',
        justifyContent: 'center',
        alignItems: 'center',
        ...(Platform.OS === 'android' && {
            elevation: 3,
        }),
    },
    streamTypeContainer: {
        marginRight: 12,
        position: 'relative',
    },
    debridIcon: {
        position: 'absolute',
        bottom: -6,
        right: -6,
    },
    streamContent: {
        flex: 1,
    },
    streamTitle: {
        color: 'white',
        fontSize: Platform.OS === 'android' ? 14 : 15,
        marginBottom: Platform.OS === 'android' ? 2 : 4,
        fontWeight: Platform.OS === 'android' ? '500' : '500',
    },
    streamDescription: {
        color: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.8)',
        fontSize: Platform.OS === 'android' ? 11 : 12,
        marginBottom: Platform.OS === 'android' ? 4 : 6,
        lineHeight: Platform.OS === 'android' ? 14 : 16,
    },
    primaryTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginRight: 8,
    },
    qualityTag: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        marginBottom: 4,
    },
    tagText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    streamGroup: {
        marginBottom: 16,
        paddingBottom: 4,
    },
    streamGroupTitle: {
        color: 'white',
        fontSize: Platform.OS === 'android' ? 14 : 16,
        fontWeight: Platform.OS === 'android' ? '500' : 'bold',
        marginBottom: Platform.OS === 'android' ? 8 : 12,
        borderLeftWidth: 3,
        borderLeftColor: '#E50914',
        paddingLeft: 8,
    },
});
