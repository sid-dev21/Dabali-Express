import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900">Dabali Express</h1>
              <nav className="flex space-x-4">
                <a href="/login" className="text-gray-600 hover:text-gray-900">Connexion</a>
                <a href="/register" className="text-gray-600 hover:text-gray-900">Inscription</a>
              </nav>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<div>Bienvenue sur Dabali Express</div>} />
            <Route path="/login" element={<div>Page de connexion</div>} />
            <Route path="/register" element={<div>Page d'inscription</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
