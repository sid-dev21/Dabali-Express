// Test pour l'écran de login de l'application Dabali Express

import 'package:flutter_test/flutter_test.dart';

import 'package:canteen_parent_app/main.dart';

void main() {
  testWidgets('Login screen renders correctly', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const MyApp());

    // Verify that login screen is displayed
    expect(find.text('Dabali Express'), findsOneWidget);
    expect(find.text('Espace Parent'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Mot de passe'), findsOneWidget);
    expect(find.text('Se connecter'), findsOneWidget);
    expect(find.text('Mot de passe oublié?'), findsOneWidget);
  });
}
