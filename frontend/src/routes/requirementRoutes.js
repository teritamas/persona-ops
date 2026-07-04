const express = require('express');
const router = express.Router();
const requirementController = require('../controllers/requirementController');

router.get('/view/requirements', requirementController.getRequirementsDashboard);
router.get('/view/requirements/:requirementId', requirementController.getRequirementsDashboard);
router.get(
  '/requirements/:requirementId/card',
  requirementController.getRequirementCard,
);
router.get(
  '/requirements/:requirementId/edit',
  requirementController.getRequirementEditForm,
);
router.post('/requirements/save', requirementController.saveRequirement);
router.get('/requirements/new-form', requirementController.createNewRequirementForm);
router.delete('/requirements/:requirementId', requirementController.deleteRequirement);

module.exports = router;
