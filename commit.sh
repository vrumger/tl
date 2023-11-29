if [ ! -z "$(git status --porcelain schemes/)" ]; then
    git config user.name "Lungers Bot"
    git config user.email "github-bot@lungers.com"
    git add last-commit.txt schemes/
    git commit -m "Update to layer $(jq -r .layer schemes/layer.json)"
    git push
fi
