export const LoadingScreen = () => {
	return (
		<div style={{
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			width: '100%',
			height: '100vh',
			flexDirection: 'column',
			gap: 12,
			fontFamily: 'var(--font-display)',
			color: 'var(--paper)'
		}}>
			<h1 style={{ color: 'var(--gold)', letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>Yut Wars</h1>
			<p style={{ opacity: 0.7, fontFamily: 'var(--font-body)' }}>Connecting…</p>
		</div>
	)
}
