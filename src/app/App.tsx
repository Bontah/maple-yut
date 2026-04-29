import { Activity } from './Activity.js'
import { DiscordContextProvider } from '../hooks/useDiscordSdk.js'
import { LoadingScreen } from '../components/LoadingScreen.js'
import { YutGameProvider } from '../hooks/useYutGame.js'
import './global.css'

export default function App() {
	return (
		<DiscordContextProvider
			authenticate
			loadingScreen={<LoadingScreen />}
			scope={['identify', 'guilds', 'guilds.members.read']}
		>
			<YutGameProvider>
				<Activity />
			</YutGameProvider>
		</DiscordContextProvider>
	)
}
