import ShowRatingsScreen from '@/screens/ShowRatingsScreen';
import { useLocalSearchParams } from 'expo-router';

export default function ShowRatingsRoute() {
    const { showId } = useLocalSearchParams();
    return <ShowRatingsScreen route={{ params: { showId: Number(showId) } }} />;
} 