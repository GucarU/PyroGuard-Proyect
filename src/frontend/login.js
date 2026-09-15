import React from 'react';
import { View, Text, Button } from 'react-native';

export default function Login() {
  return (
    <View>
      <Text>Pantalla de Inicio de Sesión - PyroGuard</Text>

      <Button
        title="Ingresar"
        onPress={() => console.log('Login presionado')}
      />
    </View>
  );
}