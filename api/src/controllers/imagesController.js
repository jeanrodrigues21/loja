const { supabase } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;
    const fileBuffer = await fs.readFile(filePath);

    const bucketName = 'service-images';
    const storagePath = `${req.user.id}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      await fs.unlink(filePath);
      throw new Error(error.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    const { data: imageRecord, error: dbError } = await supabase
      .from('images')
      .insert([{
        user_id: req.user.id,
        file_name: fileName,
        file_path: storagePath,
        url: publicUrlData.publicUrl,
        mime_type: req.file.mimetype,
        size: req.file.size
      }])
      .select()
      .single();

    if (dbError) {
      throw new Error(dbError.message);
    }

    await fs.unlink(filePath);

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: { image: imageRecord }
    });
  } catch (error) {
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    next(error);
  }
};

const getUserImages = async (req, res, next) => {
  try {
    const { data: images, error } = await supabase
      .from('images')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data: { images }
    });
  } catch (error) {
    next(error);
  }
};

const deleteImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: image, error: fetchError } = await supabase
      .from('images')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const bucketName = 'service-images';
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([image.file_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    const { error: deleteError } = await supabase
      .from('images')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadImage,
  getUserImages,
  deleteImage
};
