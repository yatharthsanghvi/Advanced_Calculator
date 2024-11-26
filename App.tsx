// App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  PixelRatio,
  Platform,
  SafeAreaView,
  StatusBar,
  Switch,
  Modal,
  useColorScheme,
  KeyboardAvoidingView,
  Alert,
  Share
} from 'react-native';
import { 
  widthPercentageToDP as wp, 
  heightPercentageToDP as hp 
} from 'react-native-responsive-screen';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from './theme';
import { Theme, HistoryItem, ConversionType } from './types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';

const CONVERSION_TYPES: ConversionType[] = [
  { from: 'm', to: 'ft', label: 'Meters to Feet', multiplier: 3.28084, category: 'Length' },
  { from: 'km', to: 'mi', label: 'Kilometers to Miles', multiplier: 0.621371, category: 'Length' },
  { from: 'kg', to: 'lb', label: 'Kilograms to Pounds', multiplier: 2.20462, category: 'Weight' },
  { from: '°C', to: '°F', label: 'Celsius to Fahrenheit', multiplier: 1.8, category: 'Temperature' },
  { from: 'L', to: 'gal', label: 'Liters to Gallons', multiplier: 0.264172, category: 'Volume' },
  { from: 'km/h', to: 'mph', label: 'KM/H to MPH', multiplier: 0.621371, category: 'Speed' },
  { from: 'cm²', to: 'in²', label: 'Sq Centimeters to Sq Inches', multiplier: 0.155, category: 'Area' },
  { from: 'g', to: 'oz', label: 'Grams to Ounces', multiplier: 0.035274, category: 'Weight' }
];

export default function SuperCalculator() {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const theme: Theme = isDarkMode ? darkTheme : lightTheme;
  
  const [selectedTab, setSelectedTab] = useState('Calc');
  const [memory, setMemory] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  
  // Calculator state
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [lastOperation, setLastOperation] = useState('');
  
  // Conversion state
  const [selectedConversion, setSelectedConversion] = useState(CONVERSION_TYPES[0]);
  const [convertedValue, setConvertedValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Tip calculator state
  const [billAmount, setBillAmount] = useState('');
  const [tipPercentage, setTipPercentage] = useState(15);
  const [splitCount, setSplitCount] = useState(1);
  const [tipResult, setTipResult] = useState<{
    tip: number;
    total: number;
    perPerson: number;
  } | null>(null);
  
  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [slideAnim] = useState(new Animated.Value(0));

  // State for selected units
  const [fromUnit, setFromUnit] = useState(CONVERSION_TYPES[0].from);
  const [toUnit, setToUnit] = useState(CONVERSION_TYPES[0].to);

  // Load saved preferences and history
  useEffect(() => {
    loadPreferences();
    loadHistory();
  }, []);

  const loadPreferences = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Enhanced calculator functions
  const handleMemoryOperation = (operation: 'MC' | 'MR' | 'M+' | 'M-') => {
    switch (operation) {
        case 'MC':
            setMemory(0); // Ensure this updates the memory state
            break;
        case 'MR':
            setCalcInput(memory.toString()); // Ensure this sets the input correctly
            break;
        case 'M+':
            const currentValue = parseFloat(calcResult || calcInput);
            if (!isNaN(currentValue)) {
                setMemory(memory + currentValue); // Ensure this updates memory correctly
            }
            break;
        case 'M-':
            const value = parseFloat(calcResult || calcInput);
            if (!isNaN(value)) {
                setMemory(memory - value); // Ensure this updates memory correctly
            }
            break;
    }
  };

  const handleCalcInput = (value: string) => {
    if (calcResult && !['/', '*', '-', '+'].includes(value)) {
      setCalcInput(value);
      setCalcResult('');
    } else {
      setCalcInput(prev => prev + value);
    }
    setLastOperation(value);
  };

  const calculateResult = () => {
    try {
      const sanitizedInput = calcInput.replace(/[^0-9+\-*/().]/g, '');
      const result = Function('"use strict";return (' + sanitizedInput + ')')();
      const formattedResult = Number.isInteger(result) ? 
        result.toString() : 
        parseFloat(result.toFixed(8)).toString();
      
      setCalcResult(formattedResult);
      addToHistory({
        id: Date.now().toString(),
        type: 'calculation',
        expression: calcInput,
        result: formattedResult,
        timestamp: Date.now(),
        category: 'Basic'
      });
    } catch (error) {
      setCalcResult('Error');
      Alert.alert('Error', 'Invalid expression');
    }
  };

  // Enhanced conversion functions
  const getCategories = () => {
    return ['All', ...new Set(CONVERSION_TYPES.map(type => type.category))];
  };

  const filteredConversions = CONVERSION_TYPES.filter(type =>
    selectedCategory === 'All' || type.category === selectedCategory
  );

  const handleConversion = () => {
    const value = parseFloat(convertedValue);
    if (isNaN(value)) {
        Alert.alert('Error', 'Please enter a valid number');
        return;
    }

    const selectedConversion = CONVERSION_TYPES.find(type => type.from === fromUnit && type.to === toUnit);
    if (selectedConversion) {
        let result = value * selectedConversion.multiplier;
        const formattedResult = result.toFixed(2);
        addToHistory({
            id: Date.now().toString(),
            type: 'conversion',
            result: `${convertedValue}${fromUnit} = ${formattedResult}${toUnit}`,
            timestamp: Date.now(),
            category: selectedConversion.category
        });
        setConvertedValue(formattedResult);
    } else {
        Alert.alert('Error', 'Conversion type not found');
    }
  };

  // Enhanced tip calculator
  const calculateTip = () => {
    const bill = parseFloat(billAmount);
    if (isNaN(bill)) {
      setTipResult(null);
      Alert.alert('Error', 'Please enter a valid bill amount');
      return;
    }

    const tip = (bill * tipPercentage) / 100;
    const total = bill + tip;
    const perPerson = total / splitCount;

    setTipResult({ tip, total, perPerson });

    addToHistory({
      id: Date.now().toString(),
      type: 'tip',
      result: `Bill: $${bill.toFixed(2)}, Tip: $${tip.toFixed(2)} (${tipPercentage}%), Total: $${total.toFixed(2)}, Per Person: $${perPerson.toFixed(2)}`,
      timestamp: Date.now(),
      category: 'Tip'
    });
  };

  // History management
  const loadHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem('calculatorHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const addToHistory = async (item: HistoryItem) => {
    const newHistory = [item, ...history].slice(0, 100);
    setHistory(newHistory);
    try {
      await AsyncStorage.setItem('calculatorHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  };

  const clearHistory = async () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all history?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setHistory([]);
            await AsyncStorage.removeItem('calculatorHistory');
          }
        }
      ]
    );
  };

  const filteredHistory = history.filter(item =>
    item.result.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.expression?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleShare = async (item: HistoryItem) => {
    try {
      await Share.share({
        message: item.type === 'calculation' && item.expression 
          ? `${item.expression} = ${item.result}` 
          : item.result,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Animation and navigation
  const changeTab = (tab: string) => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setSelectedTab(tab);
  };

  // Settings Modal
  const SettingsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isSettingsVisible}
      onRequestClose={() => setIsSettingsVisible(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Settings</Text>
          
          <View style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={isDarkMode ? theme.secondary : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.primary }]}
            onPress={() => setIsSettingsVisible(false)}
          >
            <Text style={[styles.modalButtonText, { color: theme.surface }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        backgroundColor={theme.background}
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      />
      
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerText, { color: theme.text }]}>Super Calculator</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setIsSettingsVisible(true)}
        >
          <Icon name="cog" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: theme.surface }]}>
        {['Calc', 'Convert', 'Tip', 'History'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selectedTab === tab && styles.activeTab,
              { borderBottomColor: theme.primary }
            ]}
            onPress={() => changeTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: theme.textSecondary },
                selectedTab === tab && { color: theme.primary }
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Animated.View
          style={[
            styles.content,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          {selectedTab === 'Calc' && (
            <View style={styles.calculatorContainer}>
              <View style={[styles.display, { backgroundColor: theme.surface }]}>
                <Text style={[styles.calcInput, { color: theme.textSecondary }]}>
                  {calcInput}
                </Text>
                <Text style={[styles.calcResult, { color: theme.text }]}>
                  {calcResult}
                </Text>
              </View>
              {/* Memory Functions */}
              <View style={styles.memoryContainer}>
                {['MC', 'MR', 'M+', 'M-'].map((op) => (
                    <TouchableOpacity
                        key={op}
                        style={[styles.memoryButton, { backgroundColor: theme.surface }]}
                        onPress={() => handleMemoryOperation(op as 'MC' | 'MR' | 'M+' | 'M-')} // Ensure this calls the function correctly
                    >
                        <Text style={[styles.memoryButtonText, { color: theme.primary }]}>
                            {op}
                        </Text>
                    </TouchableOpacity>
                ))}
              </View>

              <View style={styles.buttonGrid}>
                {[
                  '(', ')', '%', 'C',
                  '7', '8', '9', '/',
                  '4', '5', '6', '*',
                  '1', '2', '3', '-',
                  '0', '.', '=', '+',
                ].map((button) => (
                  <TouchableOpacity
                    key={button}
                    style={[
                      styles.calcButton,
                      { backgroundColor: theme.surface },
                      ['/', '*', '-', '+', '='].includes(button) && 
                      { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      if (button === 'C') {
                        setCalcInput('');
                        setCalcResult('');
                      } else if (button === '=') {
                        calculateResult();
                      } else {
                        handleCalcInput(button);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.calcButtonText,
                        { color: ['/', '*', '-', '+', '='].includes(button) ? 
                          theme.surface : theme.text }
                      ]}
                    >
                      {button}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {selectedTab === 'Convert' && (
            <ScrollView 
              style={[styles.converterContainer, { backgroundColor: theme.background }]}
              showsVerticalScrollIndicator={false}
            >
              {/* Category Selection */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoryContainer}
              >
                {getCategories().map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      { backgroundColor: theme.surface },
                      selectedCategory === category && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: selectedCategory === category ? theme.surface : theme.text }
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.conversionInputContainer}>
              <TextInput
                  style={[styles.conversionInput, { 
                      borderColor: theme.border,
                      color: theme.text,
                      backgroundColor: theme.background
                  }]}
                  placeholder={`Enter value`}
                  placeholderTextColor={theme.textSecondary}
                  value={convertedValue}
                  onChangeText={setConvertedValue}
                  keyboardType="numeric"
              />

              {/* From Unit Picker */}
              <Picker
                  selectedValue={fromUnit}
                  onValueChange={(itemValue: string) => setFromUnit(itemValue)}
                  style={{ 
                      color: theme.text,
                      backgroundColor: theme.background
                  }} 
                  itemStyle={{ 
                      color: isDarkMode ? '#FFFFFF' : '#000000'
                  }}
              >
                  {CONVERSION_TYPES.map((type) => (
                      <Picker.Item 
                          key={type.from} 
                          label={type.from} 
                          value={type.from} 
                      />
                  ))}
              </Picker>

              {/* To Unit Picker */}
              <Picker
                  selectedValue={toUnit}
                  onValueChange={(itemValue: string) => setToUnit(itemValue)}
                  style={{ 
                      color: theme.text,
                      backgroundColor: theme.background
                  }} 
                  itemStyle={{ 
                      color: isDarkMode ? '#FFFFFF' : '#000000'
                  }}
              >
                  {CONVERSION_TYPES.map((type) => (
                      <Picker.Item 
                          key={type.to} 
                          label={type.to} 
                          value={type.to} 
                      />
                  ))}
              </Picker>
                <TouchableOpacity
                  style={[styles.convertButton, { backgroundColor: theme.primary }]}
                  onPress={handleConversion}
              >
                  <Text style={[styles.convertButtonText, { color: theme.surface }]}>
                      Convert
                  </Text>
              </TouchableOpacity>

              <TouchableOpacity
                  style={[styles.clearButton, { backgroundColor: theme.accent }]}
                  onPress={() => setConvertedValue('')}
              >
                  <Text style={[styles.clearButtonText, { color: theme.surface }]}>
                      Clear
                  </Text>
              </TouchableOpacity>
          </View>
            </ScrollView>
          )}

          {selectedTab === 'Tip' && (
            <ScrollView 
              style={[styles.tipContainer, { backgroundColor: theme.background }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.tipCard, { backgroundColor: theme.surface }]}>
                <TextInput
                  style={[styles.tipInput, { 
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.background
                  }]}
                  placeholder="Enter bill amount"
                  placeholderTextColor={theme.textSecondary}
                  value={billAmount}
                  onChangeText={setBillAmount}
                  keyboardType="numeric"
                />

                <Text style={[styles.tipText, { color: theme.text }]}>
                  Tip: {tipPercentage}%
                </Text>
                
                <Slider
                  style={styles.tipSlider}
                  minimumValue={0}
                  maximumValue={30}
                  step={1}
                  value={tipPercentage}
                  onValueChange={setTipPercentage}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={theme.primary}
                />

                <Text style={[styles.tipText, { color: theme.text }]}>
                  Split between {splitCount} {splitCount === 1 ? 'person' : 'people'}
                </Text>

                <Slider
                  style={styles.tipSlider}
                  minimumValue={1}
                  maximumValue={20}
                  step={1}
                  value={splitCount}
                  onValueChange={setSplitCount}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={theme.primary}
                />

                <TouchableOpacity
                  style={[styles.calculateTipButton, { backgroundColor: theme.primary }]}
                  onPress={calculateTip}
                >
                  <Text style={[styles.calculateTipButtonText, { color: theme.surface }]}>
                    Calculate Tip
                  </Text>
                </TouchableOpacity>

                {tipResult && (
                  <View style={[styles.tipResultContainer, { backgroundColor: theme.background }]}>
                    <Text style={[styles.tipResultText, { color: theme.text }]}>
                      Tip: {tipResult.tip.toFixed(2)}
                    </Text>
                    <Text style={[styles.tipResultText, { color: theme.text }]}>
                      Total: {tipResult.total.toFixed(2)}
                    </Text>
                    <Text style={[styles.tipResultText, { color: theme.text }]}>
                      Per Person: {tipResult.perPerson.toFixed(2)}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.clearButton, { 
                    backgroundColor: theme.accent,
                    marginTop: 20 
                  }]}
                  onPress={() => {
                    setBillAmount('');
                    setTipPercentage(15);
                    setSplitCount(1);
                    setTipResult(null);
                  }}
                >
                  <Text style={[styles.clearButtonText, { color: theme.surface }]}>
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {selectedTab === 'History' && (
            <View style={[styles.historyContainer, { backgroundColor: theme.background }]}>
              <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
                <TextInput
                  style={[styles.searchInput, { 
                    backgroundColor: theme.background,
                    color: theme.text
                  }]}
                  placeholder="Search history..."
                  placeholderTextColor={theme.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <ScrollView style={styles.historyList}>
                {filteredHistory.map((item) => (
                  <View 
                    key={item.id}
                    style={[styles.historyItem, { backgroundColor: theme.surface }]}
                  >
                    <View style={styles.historyItemHeader}>
                      <Text style={[styles.historyItemType, { color: theme.primary }]}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </Text>
                      {item.category && (
                        <Text style={[styles.historyItemCategory, { color: theme.textSecondary }]}>
                          {item.category}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.historyItemText, { color: theme.text }]}>
                      {item.type === 'calculation' && item.expression && 
                        `${item.expression} = ${item.result}`}
                      {item.type !== 'calculation' && item.result}
                    </Text>
                    <Text style={[styles.historyTimestamp, { color: theme.textSecondary }]}>
                      {new Date(item.timestamp).toLocaleString()}
                    </Text>
                    <TouchableOpacity
                      style={[styles.shareButton, { backgroundColor: theme.primary }]}
                      onPress={() => handleShare(item)}
                    >
                      <Text style={[styles.shareButtonText, { color: theme.surface }]}>Share</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {history.length > 0 && (
                <TouchableOpacity
                  style={[styles.clearHistoryButton, { backgroundColor: theme.accent }]}
                  onPress={clearHistory}
                >
                  <Text style={[styles.clearHistoryButtonText, { color: theme.surface }]}>
                    Clear History
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>

      <SettingsModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('4%'),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerText: {
    fontSize: wp('6%'),
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: wp('2%'),
  },
  tabContainer: {
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    padding: wp('4%'),
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: wp('4%'),
  },
  content: {
    flex: 1,
  },
  calculatorContainer: {
    padding: wp('4%'),
  },
  display: {
    padding: wp('5%'),
    borderRadius: 10,
    marginBottom: hp('3%'),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  calcInput: {
    fontSize: wp('6%'),
    textAlign: 'right',
  },
  calcResult: {
    fontSize: wp('9%'),
    textAlign: 'right',
    fontWeight: 'bold',
  },
  memoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp('2%'),
  },
  memoryButton: {
    padding: wp('2.5%'),
    borderRadius: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  memoryButtonText: {
    fontSize: wp('4%'),
    fontWeight: 'bold',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calcButton: {
    width: wp('20%'),
    height: wp('20%'),
    justifyContent: 'center',
    alignItems: 'center',
    margin: wp('1.3%'),
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  calcButtonText: {
    fontSize: wp('6%'),
    fontWeight: '500',
  },
  // Converter styles
  converterContainer: {
    flex: 1,
    padding: wp('4%'),
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: hp('2%'),
  },
  categoryButton: {
    padding: wp('2.5%'),
    borderRadius: 20,
    marginRight: wp('2%'),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryText: {
    fontSize: wp('3.5%'),
    fontWeight: '500',
  },
  conversionInputContainer: {
    padding: wp('5%'),
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  conversionInput: {
    height: hp('6%'),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: wp('4%'),
    marginBottom: hp('2%'),
    fontSize: wp('4%'),
  },
  convertButton: {
    padding: wp('4%'),
    borderRadius: 8,
    marginBottom: hp('1.5%'),
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  convertButtonText: {
    fontSize: wp('4%'),
    fontWeight: '600',
  },
  clearButton: {
    padding: wp('4%'),
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  clearButtonText: {
    fontSize: wp('4%'),
    fontWeight: '600',
  },
  // Tip calculator styles
  tipContainer: {
    flex: 1,
    padding: wp('4%'),
  },
  tipCard: {
    padding: wp('5%'),
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tipInput: {
    height: hp('6%'),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: wp('4%'),
    marginBottom: hp('3%'),
    fontSize: wp('4%'),
  },
  tipText: {
    fontSize: wp('4%'),
    marginBottom: hp('1.5%'),
  },
  tipSlider: {
    marginBottom: hp('3%'),
  },
  calculateTipButton: {
    padding: wp('4%'),
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: hp('3%'),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  calculateTipButtonText: {
    fontSize: wp('4%'),
    fontWeight: '600',
  },
  tipResultContainer: {
    padding: wp('4%'),
    borderRadius: 8,
    marginTop: hp('3%'),
  },
  tipResultText: {
    fontSize: wp('4.5%'),
    marginBottom: hp('1.5%'),
    fontWeight: '500',
  },
  // History styles
  historyContainer: {
    flex: 1,
    padding: wp('4%'),
  },
  searchContainer: {
    padding: wp('2.5%'),
    borderRadius: 10,
    marginBottom: hp('2%'),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  searchInput: {
    height: hp('5%'),
    borderRadius: 8,
    paddingHorizontal: wp('4%'),
    fontSize: wp('4%'),
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    padding: wp('4%'),
    borderRadius: 10,
    marginBottom: hp('1.5%'),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1%'),
  },
  historyItemType: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
  },
  historyItemCategory: {
    fontSize: wp('3%'),
  },
  historyItemText: {
    fontSize: wp('4%'),
    marginBottom: hp('1%'),
  },
  historyTimestamp: {
    fontSize: wp('3%'),
  },
  clearHistoryButton: {
    padding: wp('4%'),
    borderRadius: 8,
    alignItems: 'center',
    marginTop: hp('1.5%'),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  clearHistoryButtonText: {
    fontSize: wp('4%'),
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: wp('80%'),
    padding: wp('5%'),
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: wp('6%'),
    fontWeight: 'bold',
    marginBottom: hp('3%'),
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('3%'),
  },
  settingLabel: {
    fontSize: wp('4%'),
  },
  modalButton: {
    padding: wp('4%'),
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modalButtonText: {
    fontSize: wp('4%'),
    fontWeight: '600',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  shareButton: {
    padding: wp('2.5%'),
    borderRadius: 5,
    marginTop: hp('1.5%'),
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: wp('4%'),
    fontWeight: 'bold',
  },
});