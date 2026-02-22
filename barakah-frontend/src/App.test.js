import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './ThemeContext';
import { LanguageProvider } from './LanguageContext';

function renderApp() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

test('renders Barakah landing hero', () => {
  renderApp();
  expect(screen.getByRole('link', { name: /barakah/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /compare groceries/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /i own a grocery shop/i })).toBeInTheDocument();
});
