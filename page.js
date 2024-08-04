'use client';
import { useState, useEffect } from "react";
import { firestore } from '@/firebase';
import { Box, Modal, Typography, Stack, TextField, Button } from '@mui/material';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc } from 'firebase/firestore';
import CameraComponent from './CameraComponent';

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [recipe, setRecipe] = useState('');

  const updateInventory = async () => {
    const snapshot = query(collection(firestore, 'inventory'));
    const docs = await getDocs(snapshot);
    const inventoryList = [];
    docs.forEach((doc) => {
      inventoryList.push({
        name: doc.id,
        ...doc.data(),
      });
    });
    setInventory(inventoryList);
  };

  const addItem = async (item) => {
    if (!item) return;

    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      await setDoc(docRef, { quantity: quantity + 1 });
    } else {
      await setDoc(docRef, { quantity: 1 });
    }

    await updateInventory();
  };

  const removeItem = async (item) => {
    if (!item) return;

    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      if (quantity === 1) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { quantity: quantity - 1 });
      }
    }

    await updateInventory();
  };

  useEffect(() => {
    updateInventory();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleGetRecipe = async () => {
    try {
      const ingredients = inventory.map(item => item.name);
      const response = await fetch('/api/getRecipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients }),
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const data = await response.json();
      setRecipe(data.recipe || 'No recipe found');
    } catch (error) {
      console.error('Error fetching recipe:', error);
    }
  };

  const handleCapture = async (photo) => {
    setImage(photo);
    try {
      const response = await fetch('/api/analyzeImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: photo }),
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const data = await response.json();
      const { foodItems } = data;
  
      if (foodItems && Array.isArray(foodItems)) {
        for (const item of foodItems) {
          const docRef = doc(collection(firestore, 'inventory'), item.trim());
          await setDoc(docRef, { quantity: 1 }, { merge: true });
        }
        updateInventory();
      }
    } catch (error) {
      console.error('Error capturing image:', error);
    }
  };

  return (
    <Box width="100vw" height="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center" gap={2}>
      <Modal open={open} onClose={handleClose}>
        <Box position="absolute" top="50%" left="50%" width={400} bgcolor="white" border="2px solid #000" boxShadow={24} p={4} display="flex" flexDirection="column" gap={3} sx={{ transform: "translate(-50%,-50%)", }}>
          <Typography variant="h6">Add Item</Typography>
          <Stack width="100%" direction="row" spacing={2}>
            <TextField variant='outlined' fullWidth value={itemName} onChange={(e) => { setItemName(e.target.value) }} />
            <Button variant="outlined" onClick={() => {
              addItem(itemName);
              setItemName('');
              handleClose();
            }}>
              Add
            </Button>
          </Stack>
        </Box>
      </Modal>
      <Box display="flex" flexDirection="row" gap={2}>
        <Button variant="contained" onClick={handleOpen}>Add New Item</Button>
        <Button variant="contained" onClick={() => setCameraOpen(true)}>Open Camera</Button>
        {cameraOpen && <CameraComponent onCapture={handleCapture} />}
        <Button variant="contained" onClick={handleGetRecipe}>Get Recipe</Button>
      </Box>
        
      {/* Recipe Display */}
      {recipe && (
        <Box width="800px" border="1px solid #333" borderRadius="8px" mt={4} maxHeight="400px" overflow="auto">
          <Box width="100%" height="100px" bgcolor="white" display="flex" alignItems="center" justifyContent="center">
            <Typography variant="h4" color="#333">
              Recipe
            </Typography>
          </Box>
          <Box p={2} bgcolor="#f0f0f0">
            <Typography variant="h6" color="#333" whiteSpace="pre-wrap">
              {recipe}
            </Typography>
          </Box>
        </Box>
      )}
      
      <Box border="1px solid #333">
        <Box width="800px" height="150px" bgcolor="white" display="flex" alignItems="center" justifyContent="center">
          <Typography variant="h2" color="#333">
            Inventory Items
          </Typography>
        </Box>
        <Stack width="800px" height="400px" spacing={2} overflow="auto">
          {inventory.map(({ name, quantity }) => (
            <Box key={name} minHeight="50px" display="flex" alignItems="center" justifyContent="space-between" bgcolor="#f0f0f0" padding={2}>
              <Typography variant="h5" color="#333" textAlign="center">
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </Typography>

              <Stack direction="row" spacing={2}>
                <Button variant="contained" size="small" onClick={() => removeItem(name)}>
                  -
                </Button>
                <Typography variant="h6" color="#333" textAlign="center">
                  {quantity}
                </Typography>
                <Button variant="contained" size="small" onClick={() => addItem(name)}>
                  +
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
